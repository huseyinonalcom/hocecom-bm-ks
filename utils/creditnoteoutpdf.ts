import { Address, Document, DocumentProduct, Establishment, Logo, Payment, User } from "payload/generated-types";
import { dateFormatBe } from "./formatters/dateformatters";
import { Buffer } from "buffer";
import { formatCurrency } from "./formatters/formatcurrency";

export async function generateCreditNoteOut({
  document,
  logoBuffer,
}: {
  document: Document;
  logoBuffer?: Buffer;
}): Promise<{ filename: string; content: Buffer; contentType: string }> {
  const creditNoteDoc = document;
  const establishment = creditNoteDoc.establishment as Establishment;
  const establishmentAddress = establishment.address as Address;
  const customer = creditNoteDoc.customer as User;
  const documentProducts = creditNoteDoc.documentProducts as DocumentProduct[];

  return new Promise(async (resolve, reject) => {
    const pageLeft = 20;
    const pageTop = 40;
    try {
      const PDFDocument = require("pdfkit");
      const doc = new PDFDocument({ size: "A4", margin: 20 });
      const buffers: Uint8Array[] = [];

      doc.on("data", buffers.push.bind(buffers));

      if (logoBuffer) {
        doc.image(logoBuffer, pageLeft, pageTop, { height: 50 });
      } else {
        const response = await fetch((establishment.logo as Logo).url);
        logoBuffer = await Buffer.from(await response.arrayBuffer());
        doc.image(logoBuffer, pageLeft, pageTop, { height: 50 });
      }
      const columns = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500];

      const generateTableRow = (doc, y, name, description, price, amount, tax, subtotal, isHeader = false) => {
        if (isHeader) {
          doc.lineWidth(25);
          const bgY = y + 5;
          doc.lineCap("butt").moveTo(30, bgY).lineTo(550, bgY).stroke("black");
          doc
            .fontSize(10)
            .fillColor("white")
            .text(name, columns[0], y)
            .text(description, columns[4], y)
            .text(price, columns[6], y)
            .text(amount, columns[7], y)
            .text(tax, columns[8], y)
            .text(subtotal, columns[9], y);
        } else {
          doc
            .fontSize(10)
            .fillColor("black")
            .text(name, columns[0], y, { width: columns[3] - columns[0] })
            .text(description, columns[4], y)
            .text(price, columns[6], y)
            .text(amount, columns[7] + 20, y)
            .text(tax, columns[8], y)
            .text(subtotal, columns[9], y);
        }
      };

      const generateCreditNoteTable = (doc, documentProducts, y) => {
        let creditNoteTableTop = y;
        generateTableRow(doc, creditNoteTableTop + 15, "Name", "Description", "Price", "Amount", "Tax", "Subtotal", true);
        for (let i = 1; i <= documentProducts.length; i++) {
          const item = documentProducts[i - 1];
          const position = creditNoteTableTop + i * 40;
          generateTableRow(
            doc,
            position,
            item.name,
            item.description,
            formatCurrency(item.value.toFixed(2)),
            item.amount,
            formatCurrency(Number(item.subTotalTax).toFixed(2)),
            formatCurrency(Number(item.subTotal).toFixed(2))
          );
        }
        return creditNoteTableTop + (documentProducts.length + 1) * 40;
      };

      const bankDetails = ({ doc, x, y, establishment }) => {
        let strings = [];
        if (establishment.bankAccount1) {
          strings.push(establishment.bankAccount1);
        }
        if (establishment.bankAccount2 !== null) {
          strings.push(establishment.bankAccount2);
        }
        if (establishment.bankAccount3 !== null) {
          strings.push(establishment.bankAccount3);
        }
        strings.map((string, index) => {
          doc.text(string, x, y + index * 15);
        });
      };

      const customerDetails = ({ doc, x, y, creditNoteDoc }) => {
        let strings = [];
        const docAddress = creditNoteDoc.delAddress;

        if (customer.customerCompany) {
          strings.push(customer.customerCompany);
        }

        if (customer.customerTaxNumber) {
          strings.push(customer.customerTaxNumber);
        }

        if (customer.phone) {
          strings.push(customer.phone);
        }

        strings.push(docAddress.street + " " + docAddress.door);
        if (docAddress.floor) {
          strings.push("floor: " + docAddress.floor);
        }
        strings.push(docAddress.zip + " " + docAddress.city + " " + docAddress.country);

        strings.map((string, index) => {
          doc.text(string, x, y + index * 15);
        });
        return y + strings.length * 15;
      };

      const taxTable = ({ doc, x, y, documentProducts }) => {
        let taxRates = [];

        documentProducts.forEach((docProd, i) => {
          if (!taxRates.includes(docProd.tax)) {
            taxRates.push(docProd.tax);
          }
        });

        taxRates = taxRates.sort((a, b) => a - b);

        doc.fontSize(10).text("Total Tax:", x, y + 50);
        doc.text(formatCurrency(documentProducts.reduce((acc, dp) => acc + Number(dp.subTotalTax), 0)), x + 80, y + 50);

        taxRates.map((taxRate, index) => {
          doc
            .text("Total Tax " + taxRate + "%:", x, y + 50 + (index + 1) * 15)
            .text(
              formatCurrency(documentProducts.filter((dp) => dp.tax === taxRate).reduce((acc, dp) => acc + Number(dp.subTotalTax), 0)),
              x + 80,
              y + 50 + (index + 1) * 15
            );
        });

        return y + taxRates.length * 15 + 50;
      };

      doc.fontSize(20).text("CREDIT NOTE", 455, pageTop);

      doc.fontSize(10).text("Credit Note:", 380, 80);
      doc.text(creditNoteDoc.number, 450, 80);
      doc.text("Date:", 380, 95);
      doc.text(dateFormatBe(creditNoteDoc.date), 450, 95);

      let y = 140;

      doc.text(establishment.name, 50, y);
      doc.text(establishment.taxID, 50, y + 15);
      bankDetails({
        doc: doc,
        x: 50,
        y: y + 30,
        establishment: establishment,
      });

      doc.text(establishmentAddress.street + " " + establishmentAddress.door, 200, y);
      doc.text(establishmentAddress.zip + " " + establishmentAddress.city, 200, y + 15);
      doc.text(establishment.phone, 200, y + 30);
      doc.text(establishment.phone2, 200, y + 45);

      doc.text("Reference: " + creditNoteDoc.references, 380, y);
      doc.text(customer.firstName + " " + customer.lastName, 380, y + 15);
      y = customerDetails({
        doc: doc,
        x: 380,
        y: y + 30,
        creditNoteDoc,
      });

      y += 60;

      y = generateCreditNoteTable(doc, documentProducts, y);

      if (y < 500) {
        y = 500;
      }

      taxTable({
        doc: doc,
        x: 30,
        y: y,
        documentProducts: documentProducts,
      });

      let totalsX = 410;
      doc.text("Total Excl. Tax:", totalsX, y + 50);
      doc.text(
        formatCurrency(
          documentProducts.reduce((acc, dp) => acc + Number(dp.subTotal), 0) - documentProducts.reduce((acc, dp) => acc + Number(dp.subTotalTax), 0)
        ),
        totalsX + 70,
        y + 50
      );
      doc.text("Total:", totalsX, y + 65);
      doc.text(formatCurrency(documentProducts.reduce((acc, dp) => acc + Number(dp.subTotal), 0)), totalsX + 70, y + 65);

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
      reject(`Error generating creditnote: ${error.message}`);
    }
  });
}
