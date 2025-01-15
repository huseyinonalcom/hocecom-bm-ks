export const pdfInvoicingDetails = ({ doc, invoiceDoc, x, y, width }: { doc: PDFKit.PDFDocument; invoiceDoc: any; x: number; y: number; width: number }) => {
  const customer = invoiceDoc.customer;
  const address = invoiceDoc.docAddress;
  doc.fontSize(10).text("Invoicing: " + customer.firstName + " " + customer.lastName, x, y, {
    width: width,
    align: "left",
  });

  doc.text(address.street + " " + address.door, {
    width: width,
    align: "left",
  });

  if (address.floor) {
    doc.text("floor: " + address.floor, {
      width: width,
      align: "left",
    });
  }

  if (address.zip || address.city) {
    doc.text(address.zip + " " + address.city, {
      width: width,
      align: "left",
    });
  }

  if (address.province || address.country) {
    doc.text(address.province + " " + address.country, {
      width: width,
      align: "left",
    });
  }
  return doc.y;
};
