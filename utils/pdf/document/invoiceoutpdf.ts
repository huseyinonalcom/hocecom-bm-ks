import { formatCurrency } from "../../formatters/formatcurrency";
import { dateFormatBe } from "../../formatters/dateformatters";
import { flexBox, PageSize } from "../common/positioning";
import { pdfHead } from "../common/pdfhead";
import { Buffer } from "buffer";
import { pdfPaymentDetails } from "../common/paymentdetails";
import { pdfInvoicingDetails } from "../common/invoicingdetails";
import { pdfDeliveryDetails } from "../common/deliverydetails";
import { generateInvoiceTable } from "../common/productstable";
import { paymentsTable } from "../common/paymenthistory";

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

      const taxTable = ({ doc, x, y, documentProducts }: { doc: any; x: number; y: number; documentProducts: any[] }) => {
        let taxRates: number[] = [];

        documentProducts.forEach((docProd, i) => {
          if (!taxRates.includes(docProd.tax)) {
            taxRates.push(docProd.tax);
          }
        });

        taxRates = taxRates.sort((a, b) => a - b);

        doc.fontSize(10).text("Total Tax:", x, y + 50);
        doc.text(formatCurrency(Number(document.totalTax)));

        taxRates.map((taxRate, index) => {
          doc
            .text("Total Tax " + taxRate + "%:", x, y + 50 + (index + 1) * 15)
            .text(
              formatCurrency(documentProducts.filter((dp) => dp.tax === taxRate).reduce((acc, dp) => acc + Number(dp.totalTax), 0)),
              x + 80,
              y + 50 + (index + 1) * 15
            );
        });

        return y + taxRates.length * 15 + 50;
      };

      let y = generateInvoiceTable(doc, documentProducts, endOfDetailsRow);

      taxTable({
        doc: doc,
        x: 30,
        y: y,
        documentProducts: documentProducts,
      });

      paymentsTable({ doc: doc, x: 170, y: y + 30, payments: payments });

      let totalsX = 410;
      doc.text("Total Excl. Tax:", totalsX, y + 50);
      doc.text(formatCurrency(Number(invoiceDoc.total) - Number(invoiceDoc.totalTax)));
      doc.text("Total:", totalsX, y + 65);
      doc.text(formatCurrency(Number(invoiceDoc.total)), totalsX + 70, y + 65);
      doc.text("Already Paid:", totalsX, y + 80);
      doc.text(formatCurrency(Number(invoiceDoc.totalPaid)), totalsX + 70, y + 80);
      doc.text("To Pay:", totalsX, y + 95);
      doc.text(formatCurrency(Number(invoiceDoc.totalToPay)), totalsX + 70, y + 95);

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
