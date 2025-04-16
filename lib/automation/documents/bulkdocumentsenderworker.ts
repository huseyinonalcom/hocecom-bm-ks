import { dateFormatBe, dateFormatOnlyDate } from "../../formatters/dateformatters";
import { writeAllXmlsToTempDir } from "../../peppol/xml/convert";
import { sendMail } from "../../mail/sendmail";
import { workerData } from "worker_threads";
import { mkdir, rm } from "fs/promises";
import { writeFileSync } from "fs";
import archiver from "archiver";
import path from "path";
import os from "os";

const documents = workerData.documents;
const company = workerData.company;

const run = async () => {
  try {
    documents.sort((a: { date: any }, b: { date: any }) => a.date - b.date);

    const tempDir = path.join(os.tmpdir(), "pdf_temp" + company.id + dateFormatOnlyDate(documents.at(0).date));

    await rm(tempDir, { recursive: true, force: true });
    await mkdir(tempDir);

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
    console.info(
      "Worker for dates",
      dateFormatOnlyDate(documents.at(0).date),
      "to",
      dateFormatOnlyDate(documents.at(-1).date),
      "for company",
      company.name,
      "finished"
    );
  } catch (error) {
    console.error("An error occurred:", error);
  }
};

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
        writeFileSync(zipPath, new Uint8Array(Buffer.concat(buffers as unknown as Uint8Array[])));
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
    recipient:
      documents.at(0).type == "credit_note_incoming" || documents.at(0).type == "purchase" ? company.einvoiceEmailIncoming : company.einvoiceEmailOutgoing,
    subject: `Documenten ${company.name} ${dateFormatBe(documents.at(0).date)} - ${dateFormatBe(documents.at(-1).date)}`,
    company: company,
    establishment: documents.at(0).establishment,
    attachments: [
      {
        filename: zipPath.replaceAll("\\", "/").split("/").at(-1),
        path: zipPath,
      },
    ],
    html: `<p>Beste, in bijlage alle documenten van ${company.name} voor het periode tussen ${
      dateFormatBe(documents.at(0).date) + " en " + dateFormatBe(documents.at(-1).date)
    }.</p>`,
  });
}

run();
