import { generateCreditNoteOut } from "./utils/pdf/document/creditnotepdf";
import { generateInvoiceOut } from "./utils/pdf/document/invoicepdf";
import { bulkSendDocuments } from "./utils/bulkdocumentsenderstart";
import { syncBolOrders } from "./utils/bol-offer-sync";
import { fileUpload } from "./utils/fileupload";
import { mkdirSync, writeFileSync } from "fs";
import { withAuth, session } from "./auth";
import { config } from "@keystone-6/core";
import { lists } from "./schema";
import "dotenv/config";
import { sendDocumentEmail } from "./utils/notifications/documentemail";

export default withAuth(
  config({
    db: {
      provider: "postgresql",
      url: process.env.DB as string,
      idField: { kind: "cuid" },
    },
    server: {
      port: 3399,
      cors: {
        origin: ["https://dfatest.huseyinonal.com", "http://localhost:3399", "https://acc.digitalforge.be"],
        credentials: true,
      },
      extendExpressApp: (app, context) => {
        var cron = require("node-cron");
        const multer = require("multer");

        const upload = multer({
          storage: multer.memoryStorage(),
          limits: {
            fileSize: 50 * 1024 * 1024,
          },
        });

        app.post("/rest/upload", upload.single("file"), async (req, res) => {
          const keystoneContext = await context.withRequest(req, res);
          try {
            // @ts-ignore
            if (!req.file) {
              return res.status(400).json({ message: "No valid file provided" });
            }

            // @ts-ignore
            const result = await fileUpload(req.file);

            const file = await context.sudo().query.File.createOne({
              query: "id",
              data: {
                name: result.fileName,
                url: result.fileUrl,
                company: {
                  connect: {
                    id: keystoneContext.session.data.company.id,
                  },
                },
              },
            });
            res.status(200).json({
              fileUpload: {
                id: file.id,
              },
            });
          } catch (error) {
            console.error("Upload error:", error);
            res.status(500).json({ error: "Upload failed" });
          }
        });

        app.get("/rest/pincheck", async (req, res) => {
          if (!req.query.pin) {
            return res.status(400).json({ message: "No pin provided" });
          }

          try {
            let pin = req.query.pin;
            const pinCheck = await context.sudo().query.Company.findOne({
              where: {
                pincode: String(pin),
              },
              query: "id isActive",
            });
            if (pinCheck && pinCheck.isActive) {
              res.status(200).json({ id: pinCheck.id });
            } else {
              const pinCheckAccountancy = await context.sudo().query.Accountancy.findOne({
                where: {
                  pincode: String(pin),
                },
                query: "id isActive",
              });
              if (pinCheckAccountancy && pinCheckAccountancy.isActive) {
                res.status(200).json({ id: pinCheckAccountancy.id });
              } else {
                res.status(404).json({ message: "Bad pin" });
              }
            }
          } catch (error) {
            console.error("Pin check error:", error);
            res.status(500).json({ error: "Pin check failed" });
            return;
          }
        });

        cron.schedule("*/5 * * * *", async () => {
          try {
            syncBolOrders({ context });
          } catch (error) {
            console.error("Error running cron job", error);
          }
        });

        cron.schedule("*/7 * * * *", async () => {
          try {
            const unhandledNotifications = await context.sudo().query.Notification.findMany({
              where: { handled: false },
              query: "id ",
            });
            unhandledNotifications.forEach(async (notification) => {
              if (notification.date.getTime() < new Date().getTime()) {
                if (notification.instructions.task == "sendDocumentEmail") {
                  await sendDocumentEmail({ documentId: notification.documentId, context });
                  await context.sudo().query.Notification.updateOne({
                    where: { id: notification.id },
                    data: { handled: true },
                  });
                }
              }
            });
          } catch (error) {
            console.error("Error running cron job", error);
          }
        });

        cron.schedule("10 12 * * 2", async () => {
          try {
            bulkSendDocuments({ docTypes: ["invoice", "credit_note"], context });
            bulkSendDocuments({ docTypes: ["purchase", "credit_note_incoming"], context });
          } catch (error) {
            console.error("Error starting bulk document sender", error);
          }
        });

        const generateTestPDF = async ({ id }: { id: string }) => {
          try {
            const postedDocument = await context.sudo().query.Document.findOne({
              query:
                "prefix number date externalId currency origin totalTax totalPaid totalToPay total deliveryDate type payments { value timestamp type } products { name reduction description price amount totalTax totalWithTaxAfterReduction tax } delAddress { street door zip city floor province country } docAddress { street door zip city floor province country } customer { email email2 firstName lastName phone customerCompany preferredLanguage customerTaxNumber } establishment { name bankAccount1 bankAccount2 bankAccount3 taxID phone phone2 company { emailHost emailPort emailUser emailPassword emailUser } address { street door zip city floor province country } logo { url } }",
              where: {
                id,
              },
            });
            let pdf;
            if (postedDocument.type === "invoice") {
              pdf = await generateInvoiceOut({ document: postedDocument });
            } else if (postedDocument.type === "credit_note") {
              pdf = await generateCreditNoteOut({ document: postedDocument });
            }
            if (!pdf) {
              throw new Error("No PDF generated");
            }
            mkdirSync("./test", { recursive: true });
            writeFileSync(`./test/${pdf.filename}`, new Uint8Array(pdf.content));
            console.info("Test PDF generated");
          } catch (error) {
            console.error("Error generating test pdf", error);
          }
        };
        generateTestPDF({ id: "cm5glkpe00039gx56xni3eab3" });
        generateTestPDF({ id: "cm655efqx005tbkceii8q4srg" });
        generateTestPDF({ id: "cm5o7jq5h00171076radma5m7" });
        generateTestPDF({ id: "cm6jvd8jr0012fzyf7do7p2rb" });
      },
    },
    lists,
    session,
    graphql: {
      bodyParser: {
        limit: "20mb",
      },
    },
  })
);
