import { dateFormatBe, dateFormatOnlyDate } from "../utils/formatters/dateformatters";
import { generateCreditNoteOut } from "./pdf/creditnoteoutpdf";
import { invoiceToXml, purchaseToXml } from "./peppol/peppolxml";
import { sendMail } from "../utils/sendmail";
import { workerData } from "worker_threads";
import archiver from "archiver";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { generateInvoiceOut } from "./pdf/invoiceoutpdf";

const documents = workerData.documents;
const company = workerData.company;

const run = async () => {
  try {
    const tempDir = path.join(os.tmpdir(), "pdf_temp" + company.id + dateFormatOnlyDate(documents.at(0).date));
    await fs.emptyDir(tempDir);
    await writeAllXmlsToTempDir(tempDir, documents);
    const zipPath = path.join(
      tempDir,
      "documents_" +
        company.name.replaceAll(" ", "_") +
        "_" +
        dateFormatOnlyDate(documents.at(0).date) +
        "_" +
        dateFormatOnlyDate(documents.at(-1).date) +
        ".zip"
    );
    await createZip(tempDir, zipPath);
    await sendEmailWithAttachment(zipPath);
    console.log(
      "Worker for dates",
      dateFormatOnlyDate(documents.at(0).date),
      "to",
      dateFormatOnlyDate(documents.at(-1).date),
      "for company",
      company.name,
      "finished"
    );
  } catch (error) {
    console.log(documents.at(0));
    console.error("An error occurred:", error);
  }
};

async function writeAllXmlsToTempDir(tempDir: string, documents: any[]): Promise<string[]> {
  const response = await fetch(documents.at(0).establishment.logo.url);
  let logoBuffer = await Buffer.from(await response.arrayBuffer());
  await fs.ensureDir(tempDir);

  const filePaths = await Promise.all(
    documents.map(async (doc) => {
      try {
        let pdf;
        let xml;

        if (doc.type == "invoice") {
          pdf = await generateInvoiceOut({
            document: doc,
            logoBuffer: logoBuffer,
          });
          xml = invoiceToXml(doc, pdf);
        } else if (doc.type == "credit_note") {
          pdf = await generateCreditNoteOut({
            document: doc,
            logoBuffer: logoBuffer,
          });
          xml = invoiceToXml(doc, pdf);
        } else if (doc.type == "purchase") {
          const response = await fetch(doc.files[0].url);
          const buffer = await response.arrayBuffer();
          pdf = {
            filename: doc.files[0].name,
            content: Buffer.from(buffer),
            contentType: "application/pdf",
          };
          xml = purchaseToXml(doc, pdf);
        }

        if (!xml) {
          throw new Error(`xml failed: ${doc.type}`);
        }

        if (!pdf) {
          throw new Error(`Unknown document type: ${doc.type}`);
        }

        const filePath = path.join(tempDir, xml.filename);
        await fs.writeFile(filePath, xml.content);

        return filePath;
      } catch (error) {
        console.error("Error generating xml for document: ", doc.number, error);
        return null;
      }
    })
  );

  return filePaths.filter((path) => path !== null);
}

async function createZip(tempDir: string, zipPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = [];
    const archive = archiver("zip", { zlib: { level: 5 } });

    archive.on("data", (chunk: Buffer) => {
      buffers.push(chunk);
    });

    archive.on("error", (err) => {
      console.error("Error with archive:", err);
      reject(err);
    });

    archive.on("end", () => {
      try {
        fs.writeFileSync(zipPath, new Uint8Array(Buffer.concat(buffers as unknown as Uint8Array[])));
        resolve();
      } catch (error) {
        reject(error);
      }
    });

    archive.directory(tempDir, false);

    archive
      .finalize()
      .then(() => {})
      .catch((err) => {
        console.error("Error finalizing archive:", err);
        reject(err);
      });
  });
}

async function sendEmailWithAttachment(zipPath: string): Promise<void> {
  await sendMail({
    recipient: "test@huseyinonal.com",
    subject: `Documenten ${company.name} ${dateFormatBe(documents.at(0).date)} - ${dateFormatBe(documents.at(-1).date)}`,
    company: company,
    establishment: documents.at(0).establishment,
    attachments: [
      {
        filename: zipPath.split("/").at(-1),
        path: zipPath,
      },
    ],
    html: `<p>Beste, in bijlage alle documenten van ${company.name} voor het periode tussen ${
      dateFormatBe(documents.at(0).date) + " en " + dateFormatBe(documents.at(-1).date)
    }.</p>`,
  });
}

run();
