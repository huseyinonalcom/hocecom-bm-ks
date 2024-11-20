import { fileUpload } from "./utils/fileupload";
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

            const addFile = await context.query.File.createOne({
              query: "id",
              data: {
                name: result.fileName,
                url: result.fileUrl,
              },
            });
            console.log(addFile);
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
