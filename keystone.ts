import { generateInvoiceOut } from "./utils/pdf/document/invoiceoutpdf";
import { bulkSendDocuments } from "./utils/bulkdocumentsenderstart";
import { syncBolOrders } from "./utils/bol-offer-sync";
import { fileUpload } from "./utils/fileupload";
import { mkdirSync, writeFileSync } from "fs";
import { withAuth, session } from "./auth";
import { config } from "@keystone-6/core";
import { lists } from "./schema";
import "dotenv/config";

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
              query: "id",
            });
            if (pinCheck) {
              res.status(200).json({ id: pinCheck.id });
            } else {
              const pinCheckAccountancy = await context.sudo().query.Accountancy.findOne({
                where: {
                  pincode: String(pin),
                },
                query: "id",
              });
              if (pinCheckAccountancy) {
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
            console.log("Running Cron Job for Bol Orders");
            syncBolOrders({ context });
          } catch (error) {
            console.error("Error running cron job", error);
          }
        });

        cron.schedule("0 0 2 * *", async () => {
          try {
            bulkSendDocuments({ docTypes: ["invoice", "credit_note", "purchase"], context });
          } catch (error) {
            console.error("Error starting bulk document sender", error);
          }
        });

        const generateTestPDF = async () => {
          try {
            const postedDocument = await context.sudo().query.Document.findOne({
              query:
                "prefix number date externalId origin totalTax totalPaid totalToPay total deliveryDate type payments { value timestamp type } products { name description price amount totalTax totalWithTaxAfterReduction tax } delAddress { street door zip city country } docAddress { street door zip city country } customer { email firstName lastName phone customerCompany customerTaxNumber } establishment { name bankAccount1 bankAccount2 bankAccount3 taxID phone phone2 address { street door zip city country } logo { url } }",
              where: {
                id: "cm5glkpe00039gx56xni3eab3",
              },
            });

            const pdf = await generateInvoiceOut({ document: postedDocument });
            mkdirSync("./test", { recursive: true });
            writeFileSync(`./test/${pdf.filename}`, new Uint8Array(pdf.content));
            console.info("Test invoice PDF generated");
          } catch (error) {
            console.error("Error generating test pdf", error);
          }
        };
        generateTestPDF();
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
