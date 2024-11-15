import { withAuth, session } from "./auth";
import { config } from "@keystone-6/core";
import { lists } from "./schema";
import { sendMail } from "./utils/sendmail";

export default withAuth(
  config({
    db: {
      provider: "sqlite",
      url: "file:./data.db",
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
        var nodemailer = require("nodemailer");
        var transport = nodemailer.createTransport({
          host: "mx.huseyinonal.com",
          port: 587,
          secure: false,
          auth: {
            user: "backupsercemdimuhsaebe@huseyinonal.com",
            pass: process.env.MAIL_PASS,
          },
        });
        const path = require("path");
        const fs = require("fs");
        const multer = require("multer");
        const UPLOAD_DIR = path.join(__dirname, "uploads");
        if (!fs.existsSync(UPLOAD_DIR)) {
          fs.mkdirSync(UPLOAD_DIR);
        }

        const storage = multer.diskStorage({
          destination: UPLOAD_DIR,
          // @ts-ignore
          filename: (file, cb) => {
            const uniqueName = Date.now() + "-" + (Math.random() * 1000).toFixed(0) + "-" + file.originalname;
            cb(null, uniqueName);
          },
        });

        const upload = multer({ storage });

        app.post("/rest/upload", upload.single("file"), (req, res) => {
          // @ts-ignore
          if (!req.file) {
            return res.status(400).json({ message: "File upload failed" });
          }
          // @ts-ignore
          const fileUrl = `${req.protocol}://${req.get("host")}/rest/files/${req.file.filename}`;
          // @ts-ignore
          context.lists.File.create({
            data: {
              // @ts-ignore
              filename: req.file.filename,
              // @ts-ignore
              mimetype: req.file.mimetype,
              // @ts-ignore
              encoding: req.file.encoding,
              // @ts-ignore
              size: req.file.size,
              url: fileUrl,
            },
          });
          res.json({ fileUrl });
        });

        app.get("/rest/files/:filename", (req, res) => {
          const filePath = path.join(UPLOAD_DIR, req.params.filename);

          if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
          } else {
            res.status(404).json({ message: "File not found" });
          }
        });
        cron.schedule("0 0 */1 * * *", async () => {
          try {
            const backupDir = path.join(__dirname, "backup");
            if (!fs.existsSync(backupDir)) {
              fs.mkdirSync(backupDir);
            }
            const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
            const backupFilePath = path.join(backupDir, `data-${timestamp}.db`);
            fs.copyFileSync("data.db", backupFilePath);
            const backupFiles = fs.readdirSync(backupDir);
            if (backupFiles.length > 120) {
              backupFiles.sort((a, b) => fs.statSync(path.join(backupDir, a)).mtime.getTime() - fs.statSync(path.join(backupDir, b)).mtime.getTime());
              const backupFilesToDelete = backupFiles.slice(120);
              const fourteenDaysAgo = new Date();
              fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

              backupFilesToDelete.forEach((file) => {
                const filePath = path.join(backupDir, file);
                const fileStats = fs.statSync(filePath);
                if (fileStats.mtime < fourteenDaysAgo) {
                  fs.unlinkSync(filePath);
                }
              });
            }
            try {
              sendMail({
                transport,
                attachment: [
                  {
                    filename: "data.db",
                    path: backupFilePath,
                  },
                ],
              });
            } catch (error) {
              console.error("Error sending email", error);
            }
          } catch (error) {
            console.error("Error running back-up job", error);
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
