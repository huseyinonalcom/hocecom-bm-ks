import { withAuth, session } from "./auth";
import { config } from "@keystone-6/core";
import { lists } from "./schema";

export default withAuth(
  config({
    db: {
      provider: "sqlite",
      url: "file:./data.db",
    },
    server: {
      port: 3344,
      cors: {
        origin: ["http://localhost:8081", "http://localhost:3000", "http://localhost:5173"],
        credentials: true,
      },
      extendExpressApp: (app, context) => {
        const path = require("path");
        const fs = require("fs");
        const multer = require("multer");
        const UPLOAD_DIR = path.join(__dirname, "uploads");
        if (!fs.existsSync(UPLOAD_DIR)) {
          fs.mkdirSync(UPLOAD_DIR);
        }

        const storage = multer.diskStorage({
          destination: UPLOAD_DIR,
          filename: (req, file, cb) => {
            const uniqueName = Date.now() + "-" + (Math.random() * 1000).toFixed(0) + "-" + file.originalname;
            cb(null, uniqueName);
          },
        });

        const upload = multer({ storage });

        app.post("/rest/upload", upload.single("file"), (req, res) => {
          if (!req.file) {
            return res.status(400).json({ message: "File upload failed" });
          }

          const fileUrl = `${req.protocol}://${req.get("host")}/rest/files/${req.file.filename}`;
          context.lists.File.create({
            data: {
              filename: req.file.filename,
              mimetype: req.file.mimetype,
              encoding: req.file.encoding,
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
        console.log("file upload ready");
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
