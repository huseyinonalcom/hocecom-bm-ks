import { formatCurrency } from "../../formatters/formatcurrency";
import { dateFormatBe } from "../../formatters/dateformatters";
import { flexBox, PageSize, pageSizesDimensions } from "../common/positioning";
import { pdfHead } from "../common/pdfhead";
import { Buffer } from "buffer";
import { pdfPaymentDetails } from "../common/paymentdetails";
import { pdfInvoicingDetails } from "../common/invoicingdetails";
import { pdfDeliveryDetails } from "../common/deliverydetails";
import { generateInvoiceTable } from "../common/productstable";
import { paymentsTable } from "../common/paymenthistory";
import { taxTable } from "../common/taxtotals";

export async function generateInvoiceOut({
  document,
  logoBuffer,
}: {
  document: any;
  logoBuffer?: Buffer;
}): Promise<{ filename: string; content: Buffer; contentType: string }> {
  const invoiceDoc = document;
  const documentProducts = invoiceDoc.products;
  const payments = invoiceDoc.payments;

  return new Promise(async (resolve, reject) => {
    const pageLeft = 20;
    const pageTop = 40;
    const pageSize: PageSize = "A4";
    try {
      const PDFDocument: PDFKit.PDFDocument = require("pdfkit");
      const doc = new PDFDocument({ size: pageSize, margin: 20 });
      const buffers: Uint8Array[] = [];

      doc.on("data", buffers.push.bind(buffers));

      await pdfHead({
        doc,
        invoiceDoc,
        logoBuffer,
        pageLeft,
        pageTop,
      });

      const detailsRowY = doc.y;

      let endOfDetailsRow = doc.y;
      const endOfPaymentDetails = pdfPaymentDetails({ doc, invoiceDoc, x: pageLeft + 5, y: detailsRowY, width: 160 });
      if (endOfPaymentDetails > endOfDetailsRow) {
        endOfDetailsRow = endOfPaymentDetails;
      }
      const endOfInvoicingDetails = pdfInvoicingDetails({ doc, invoiceDoc, x: 200, y: detailsRowY, width: 165 });
      if (endOfInvoicingDetails > endOfDetailsRow) {
        endOfDetailsRow = endOfInvoicingDetails;
      }
      const endOfDeliveryDetails = pdfDeliveryDetails({ doc, invoiceDoc, x: 380, y: detailsRowY, width: 165 });
      if (endOfDeliveryDetails > endOfDetailsRow) {
        endOfDetailsRow = endOfDeliveryDetails;
      }

      let y = generateInvoiceTable(doc, documentProducts, endOfDetailsRow);

      let totalsXNames = 350;
      let totalXValues = 480;
      let totalsY = pageSizesDimensions[pageSize].height - 40;
      doc.fontSize(13);

      doc.lineWidth(1);
      doc
        .lineCap("butt")
        .moveTo(350, totalsY - 85)
        .lineTo(575, totalsY - 85)
        .stroke("black");
      doc.text("To Pay:", totalsXNames, totalsY);
      doc.text("Already Paid:", totalsXNames, totalsY - 75);
      doc.text("Total Excl. Tax:", totalsXNames, totalsY - 60);
      doc.text("Total Tax:", totalsXNames, totalsY - 45);
      doc.text("Total:", totalsXNames, totalsY - 30);
      doc.lineWidth(1);
      doc
        .lineCap("butt")
        .moveTo(350, totalsY - 10)
        .lineTo(575, totalsY - 10)
        .stroke("black");
      doc.text("To Pay:", totalsXNames, totalsY);
      //
      doc.text(formatCurrency(Number(invoiceDoc.totalPaid)), totalXValues, totalsY - 75, {
        align: "right",
      });
      doc.text(formatCurrency(Number(invoiceDoc.total) - Number(invoiceDoc.totalTax)), totalXValues, totalsY - 60, {
        align: "right",
      });
      doc.text(formatCurrency(Number(invoiceDoc.totalTax)), totalXValues, totalsY - 45, {
        align: "right",
      });
      doc.text(formatCurrency(Number(invoiceDoc.total)), totalXValues, totalsY - 30, {
        align: "right",
      });
      //
      doc.text(formatCurrency(Number(invoiceDoc.totalToPay)), totalXValues, totalsY, {
        align: "right",
      });

      paymentsTable({ doc: doc, x: totalsXNames, yEnd: totalsY - 92, payments: payments });

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
          filename: `invoice_${document.number}.pdf`,
          content: pdfData,
          contentType: "application/pdf",
        });
      });
    } catch (error) {
      console.error("error on pdf generation (invoice): ", error);
      reject(`Error generating invoice: ${error}`);
    }
  });
}
