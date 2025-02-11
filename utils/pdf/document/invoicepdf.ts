import { PageSize, pageSizesDimensions } from "../common/positioning";
import { pdfInvoicingDetails } from "../common/invoicingdetails";
import { formatCurrency } from "../../formatters/formatcurrency";
import { pdfDeliveryDetails } from "../common/deliverydetails";
import { generateProductTable } from "../common/productstable";
import { pdfPaymentDetails } from "../common/paymentdetails";
import { paymentsTable } from "../common/paymenthistory";
import { t } from "../../localization/localization";
import { taxTable } from "../common/taxtotals";
import { pdfHead } from "../common/pdfhead";
import { Buffer } from "buffer";
import { returnPackage } from "../common/packagereturntotals";

export async function generateInvoiceOut({
  document,
  logoBuffer,
}: {
  document: any;
  logoBuffer?: Buffer;
}): Promise<{ filename: string; content: Buffer; contentType: string }> {
  const tr = (key: string): string => {
    try {
      return t(key, invoiceDoc.customer!.preferredLanguage);
    } catch (e) {
      return key;
    }
  };
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

      doc.font("./utils/fonts/Roboto-Regular.ttf");

      doc.on("data", buffers.push.bind(buffers));

      await pdfHead({
        doc,
        document: invoiceDoc,
        logoBuffer,
        pageLeft,
        pageTop,
      });

      const detailsRowY = doc.y;

      let endOfDetailsRow = doc.y;
      const endOfPaymentDetails = pdfPaymentDetails({ doc, document: invoiceDoc, x: pageLeft + 5, y: detailsRowY, width: 160 });
      if (endOfPaymentDetails > endOfDetailsRow) {
        endOfDetailsRow = endOfPaymentDetails;
      }
      const endOfInvoicingDetails = pdfInvoicingDetails({ doc, document: invoiceDoc, x: 200, y: detailsRowY, width: 165 });
      if (endOfInvoicingDetails > endOfDetailsRow) {
        endOfDetailsRow = endOfInvoicingDetails;
      }
      const endOfDeliveryDetails = pdfDeliveryDetails({ doc, document: invoiceDoc, x: 380, y: detailsRowY, width: 165 });
      if (endOfDeliveryDetails > endOfDetailsRow) {
        endOfDetailsRow = endOfDeliveryDetails;
      }

      generateProductTable(doc, documentProducts, endOfDetailsRow, invoiceDoc);

      let totalsXKeys = 350;
      let totalXValues = 480;
      let totalsY = pageSizesDimensions[pageSize].height - 40;
      doc.fontSize(13);

      doc.lineWidth(1);
      doc
        .lineCap("butt")
        .moveTo(350, totalsY - 85)
        .lineTo(575, totalsY - 85)
        .stroke("black");

      doc.text(tr("already-paid"), totalsXKeys, totalsY - 75);
      doc.text(tr("total-value-excl-tax"), totalsXKeys, totalsY - 60);
      doc.text(tr("total-tax"), totalsXKeys, totalsY - 45);
      doc.text(tr("total"), totalsXKeys, totalsY - 30);
      doc.lineWidth(1);
      doc
        .lineCap("butt")
        .moveTo(350, totalsY - 10)
        .lineTo(575, totalsY - 10)
        .stroke("black");
      doc.text(tr("to-pay"), totalsXKeys, totalsY);
      //
      doc.text(formatCurrency(Number(invoiceDoc.totalPaid), invoiceDoc.currency), totalXValues, totalsY - 75, {
        align: "right",
      });
      doc.text(formatCurrency(Number(invoiceDoc.total) - Number(invoiceDoc.totalTax), invoiceDoc.currency), totalXValues, totalsY - 60, {
        align: "right",
      });
      doc.text(formatCurrency(Number(invoiceDoc.totalTax), invoiceDoc.currency), totalXValues, totalsY - 45, {
        align: "right",
      });
      doc.text(formatCurrency(Number(invoiceDoc.total), invoiceDoc.currency), totalXValues, totalsY - 30, {
        align: "right",
      });
      //
      doc.text(formatCurrency(Number(invoiceDoc.totalToPay), invoiceDoc.currency), totalXValues, totalsY, {
        align: "right",
      });

      paymentsTable({ doc: doc, x: totalsXKeys, yEnd: totalsY - 92, payments: payments, invoiceDoc });

      returnPackage({ doc: doc, x: pageLeft, endY: totalsY - 92, document: document });

      taxTable({
        doc: doc,
        x: totalsXKeys - 150,
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
