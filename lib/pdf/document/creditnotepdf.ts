import { PageSize, pageSizesDimensions } from "../common/positioning";
import { formatCurrency } from "../../formatters/formatcurrency";
import { pdfInvoicingDetails } from "../common/invoicingdetails";
import { generateProductTable } from "../common/productstable";
import { pdfDeliveryDetails } from "../common/deliverydetails";
import { pdfPaymentDetails } from "../common/paymentdetails";
import { t } from "../../localization/localization";
import { taxTable } from "../common/taxtotals";
import { pdfHead } from "../common/pdfhead";
import { Buffer } from "buffer";

export async function generateCreditNoteOut({
  document,
  logoBuffer,
}: {
  document: any;
  logoBuffer?: Buffer;
}): Promise<{ filename: string; content: Buffer; contentType: string }> {
  const tr = (key: string): string => {
    try {
      return t(key, document.customer!.preferredLanguage);
    } catch (e) {
      return key;
    }
  };
  const creditNoteDoc = document;
  const documentProducts = creditNoteDoc.products;

  return new Promise(async (resolve, reject) => {
    const pageLeft = 20;
    const pageTop = 40;
    const pageSize: PageSize = "A4";
    try {
      const PDFDocument: PDFKit.PDFDocument = require("pdfkit");
      const doc = new PDFDocument({ size: pageSize, margin: 20 });
      const buffers: Uint8Array[] = [];

      doc.font("./lib/fonts/Roboto-Regular.ttf");

      doc.on("data", buffers.push.bind(buffers));

      await pdfHead({
        doc,
        document: creditNoteDoc,
        logoBuffer,
        pageLeft,
        pageTop,
      });

      const detailsRowY = doc.y;

      let endOfDetailsRow = doc.y;
      const endOfPaymentDetails = pdfPaymentDetails({ doc, document: creditNoteDoc, x: pageLeft + 5, y: detailsRowY, width: 160 });
      if (endOfPaymentDetails > endOfDetailsRow) {
        endOfDetailsRow = endOfPaymentDetails;
      }
      const endOfInvoicingDetails = pdfInvoicingDetails({ doc, document: creditNoteDoc, x: 200, y: detailsRowY, width: 165 });
      if (endOfInvoicingDetails > endOfDetailsRow) {
        endOfDetailsRow = endOfInvoicingDetails;
      }
      const endOfDeliveryDetails = pdfDeliveryDetails({ doc, document: creditNoteDoc, x: 380, y: detailsRowY, width: 165 });
      if (endOfDeliveryDetails > endOfDetailsRow) {
        endOfDetailsRow = endOfDeliveryDetails;
      }

      generateProductTable(doc, documentProducts, endOfDetailsRow, creditNoteDoc);

      let totalsXNames = 350;
      let totalXValues = 480;
      let totalsY = pageSizesDimensions[pageSize].height - 40;
      doc.fontSize(13);

      doc.lineWidth(1);

      doc.text(tr("total-value-excl-tax"), totalsXNames, totalsY - 45);
      doc.text(tr("total-tax"), totalsXNames, totalsY - 30);
      doc.lineWidth(1);
      doc
        .lineCap("butt")
        .moveTo(350, totalsY - 10)
        .lineTo(575, totalsY - 10)
        .stroke("black");
      doc.text(tr("total"), totalsXNames, totalsY);
      //

      doc.text(formatCurrency(Number(creditNoteDoc.total) - Number(creditNoteDoc.totalTax), creditNoteDoc.currency), totalXValues, totalsY - 45, {
        align: "right",
      });
      doc.text(formatCurrency(Number(creditNoteDoc.totalTax), creditNoteDoc.currency), totalXValues, totalsY - 30, {
        align: "right",
      });
      //
      doc.text(formatCurrency(Number(creditNoteDoc.total), creditNoteDoc.currency), totalXValues, totalsY, {
        align: "right",
      });

      taxTable({
        doc: doc,
        x: totalsXNames - 150,
        endY: pageSizesDimensions[pageSize].height - 40,
        document: document,
      });

      doc.end();
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        resolve({
          filename: `creditnote_${document.number}.pdf`,
          content: pdfData,
          contentType: "application/pdf",
        });
      });
    } catch (error) {
      console.error("error on pdf generation (creditnote): ", error);
      reject(`Error generating creditnote: ${error}`);
    }
  });
}
