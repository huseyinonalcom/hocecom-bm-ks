import { generateCreditNoteOut } from "../../pdf/document/creditnotepdf";
import { purchaseToXml } from "../../peppol/xml/purchase/peppolpurchase";
import { invoiceToXml } from "../../peppol/xml/invoice/peppolinvoice";
import { generateInvoiceOut } from "../../pdf/document/invoicepdf";
import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";

export async function writeAllXmlsToTempDir(tempDir: string, documents: any[]): Promise<string[]> {
  // fetch the logo and store it in a buffer to reuse it for every pdf
  const response = await fetch(documents.at(0).establishment.logo.url);
  let logoBuffer = await Buffer.from(await response.arrayBuffer());

  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir);

  // generate the xmls
  // generate/download the pdfs
  // pdfs for incoming documents have to be uploaded by tenant
  // outgoing documents are generated
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
        } else if (doc.type == "credit_note_incoming") {
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
        await writeFile(filePath, xml.content);

        return filePath;
      } catch (error) {
        console.error("Error generating xml for document: ", doc.number, error);
        return null;
      }
    })
  );

  return filePaths.filter((path) => path !== null);
}
