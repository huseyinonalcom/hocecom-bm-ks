import { fileUpload } from "./utils/fileupload";
import { withAuth, session } from "./auth";
import { config } from "@keystone-6/core";
import { lists } from "./schema";
import "dotenv/config";
import { createDocumentsFromBolOrders } from "./utils/bol-offer-sync";

export default withAuth(
  config({
    db: {
      provider: "postgresql",
      url: process.env.DB as string,
      idField: { kind: "cuid" },
    },
    server: {
      port: 3344,
      cors: {
        origin: [
          "http://localhost:8081",
          "http://localhost:3000",
          "http://localhost:5173",
          "https://serce.mdi-muhasebe.com",
          "https://serceapi.mdi-muhasebe.com",
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
          try {
            if (!context.session) {
              return res.status(401).json({ message: "Unauthorized" });
            }
            // @ts-ignore
            if (!req.file) {
              return res.status(400).json({ message: "No valid file provided" });
            }

            // @ts-ignore
            const result = await fileUpload(req.file);

            await context.query.File.createOne({
              query: "id",
              data: {
                name: result.fileName,
                url: result.fileUrl,
              },
            });
            res.status(200).json({
              fileUpload: {
                id: "somtin",
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
              res.status(404).json({ message: "Bad pin" });
            }
          } catch (error) {
            console.error("Pin check error:", error);
            res.status(500).json({ error: "Pin check failed" });
            return;
          }
        });

        // cron.schedule("*/5 * * * *", async () => {
        //   try {
        //     console.log("Running Cron Job for Bol Orders");
        //     createDocumentsFromBolOrders(context);
        //   } catch (error) {
        //     console.error("Error running cron job", error);
        //   }
        // });

        // const sendDocumentsToAccountant = async () => {
        //   try {
        //     let companiesWithMonthlyReportsActive = await context.sudo().query.Company.findMany({
        //       where: {
        //         monthlyReports: {
        //           equals: true,
        //         },
        //       },
        //     });

        //     console.log(companiesWithMonthlyReportsActive);

        //     let currentYear = new Date().getFullYear();
        //     // for (let company of companiesWithMonthlyReportsActive) {
        //     //   bulkSendDocuments({
        //     //     companyID: (company as unknown as Company).id,
        //     //     docTypes: ["invoice", "credit_note", "purchase"],
        //     //     month: new Date().getMonth(), // last month
        //     //     year: currentYear, // Current year
        //     //   });
        //     // }
        //   } catch (error) {
        //     console.error("Error starting bulk document sender", error);
        //   }
        // };

        createDocumentsFromBolOrders(context);
        // sendDocumentsToAccountant();

        cron.schedule("0 0 2 * *", async () => {
          try {
            let companiesWithMonthlyReportsActive = await context.sudo().query.companies.findMany({
              where: {
                monthlyReports: {
                  equals: true,
                },
              },
            });


            let currentYear = new Date().getFullYear();
            // for (let company of companiesWithMonthlyReportsActive) {
            //   bulkSendDocuments({
            //     companyID: (company as unknown as Company).id,
            //     docTypes: ["invoice", "credit_note", "purchase"],
            //     month: new Date().getMonth(), // last month
            //     year: currentYear, // Current year
            //   });
            // }
          } catch (error) {
            console.error("Error starting bulk document sender", error);
          }
        });
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
