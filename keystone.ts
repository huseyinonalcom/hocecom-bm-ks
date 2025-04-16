import { bulkSendDocuments } from "./lib/automation/documents/bulkdocumentsenderstart";
import { fetchDocumentByID, fetchDocuments } from "./lib/fetch/documents";
import { generateCreditNoteOut } from "./lib/pdf/document/creditnotepdf";
import { sendDocumentEmail } from "./lib/notifications/documentemail";
import { generateInvoiceOut } from "./lib/pdf/document/invoicepdf";
import { writeAllXmlsToTempDir } from "./lib/peppol/xml/convert";
import { syncBolOrders } from "./lib/bol-offer-sync";
import { fileUpload } from "./lib/fileupload";
import { mkdirSync, writeFileSync } from "fs";
import { withAuth, session } from "./auth";
import { config } from "@keystone-6/core";
import { mkdir, rm } from "fs/promises";
import { lists } from "./schema";
import "dotenv/config";
import { getTempDir } from "./lib/filesystem/getTempDir";
import { sendAllFilesInDirectory } from "./lib/mail/sendAllFilesInDirectory";

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
        origin: [
          "https://dfatest.huseyinonal.com",
          "http://localhost:3399",
          "http://localhost:3454",
          "https://acc.digitalforge.be",
          "https://dfa.huseyinonal.com",
          "https://web.digitalforge.be",
        ],
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

        app.get("/rest/documents/xml", async (req, res) => {
          if (!req.query.id) {
            return res.status(400).json({ message: "No id provided" });
          }
          const keystoneContext = await context.withRequest(req, res);

          const documentID = req.query.id.toString();

          let document;
          try {
            document = await fetchDocumentByID({
              documentID,
              context: keystoneContext,
            });

            if (document) {
              const xmlFile = (await writeAllXmlsToTempDir(`${getTempDir()}/${documentID}`, [document])).at(0);
              res.status(200).sendFile(xmlFile!);
            } else {
              res.status(400).json({ error: "This document does not exist or you do not have access to it." });
            }
          } catch (error) {
            console.error("GET XML error:", error);
            res.status(500).json({ error: "An unknown error occured." });
          }
        });

        cron.schedule("*/5 * * * *", async () => {
          try {
            syncBolOrders({ context });
          } catch (error) {
            console.error("Error running cron job", error);
          }
        });

        cron.schedule("*/2 * * * *", async () => {
          try {
            const unhandledNotifications = await context.sudo().query.Notification.findMany({
              where: { handled: { equals: false } },
              query: "id instructions handled date",
            });
            unhandledNotifications.forEach(async (notification) => {
              try {
                if (notification.handled == false) {
                  if (new Date(notification.date).getTime() < new Date().getTime()) {
                    context.sudo().query.Notification.updateOne({
                      where: { id: notification.id },
                      data: { handled: true },
                    });
                    if (notification.instructions.task == "sendDocumentEmail") {
                      sendDocumentEmail({ documentId: notification.instructions.args.documentId, context });
                    }
                  }
                }
              } catch (error) {
                console.error("Error running cron job", error);
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
                "prefix number extras date externalId currency origin totalTax totalPaid totalToPay total deliveryDate type payments { value timestamp type } products { name reduction description price amount totalTax totalWithTaxAfterReduction tax } delAddress { street door zip city floor province country } docAddress { street door zip city floor province country } customer { email email2 firstName lastName phone customerCompany preferredLanguage customerTaxNumber } establishment { name documentExtras bankAccount1 bankAccount2 bankAccount3 taxID phone phone2 company { emailHost emailPort emailUser emailPassword emailUser } address { street door zip city floor province country } logo { url } }",
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
        generateTestPDF({ id: "cm6z0evlf000046uokgw38ksl" });

        const generateTestXML = async ({ id }: { id: string }) => {
          try {
            const doc = await fetchDocumentByID({ documentID: id, context, sudo: true });
            await writeAllXmlsToTempDir("./test", [doc]);
          } catch (error) {
            console.error("Error generating test xml", error);
          }
        };

        generateTestXML({ id: "cm5f6jlkt0004jyetrc2nfvcx" });
        generateTestXML({ id: "cm6jd1xop00bz1152hdifh8nb" });

        const dumpXmls = async ({ types, companyID, recipient }: { types: string[]; companyID: string; recipient: string }) => {
          try {
            const docs = await fetchDocuments({
              companyID: companyID,
              docTypes: types,
              all: true,
              context,
            });
            console.info("Found", docs.length, "documents");
            await rm(`./test/${companyID}`, { recursive: true, force: true });
            await mkdir(`./test/${companyID}`);
            await writeAllXmlsToTempDir(`./test/${companyID}`, docs);

            sendAllFilesInDirectory({
              recipient: recipient,
              dirPath: `./test/${companyID}`,
            });
          } catch (error) {
            console.error("Error generating test xml", error);
          }
        };

        const dump = async () => {
          // dumpXmls({ types: ["purchase", "credit_note_incoming"], companyID: "cm3vqgy4k0000xcd4hl0gnco5" });
          await dumpXmls({ types: ["invoice", "credit_note"], companyID: "cm63oyuhn002zbkcezisd9sm5", recipient: "ocr-077080-22-V@import.octopus.be" });
          await dumpXmls({
            types: ["purchase", "credit_note_incoming"],
            companyID: "cm63oyuhn002zbkcezisd9sm5",
            recipient: "ocr-077080-22-A@import.octopus.be",
          });
        };
        // dump();
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
