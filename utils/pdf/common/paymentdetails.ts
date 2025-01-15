export const pdfPaymentDetails = ({ doc, invoiceDoc, x, y, width }: { doc: PDFKit.PDFDocument; invoiceDoc: any; x: number; y: number; width: number }) => {
  const address = invoiceDoc.establishment.address;
  doc.fontSize(10).text(address.street + " " + address.door, x, y, {
    width: width,
    align: "left",
  });

  if (address.zip || address.city) {
    doc.text(address.zip + " " + address.city, {
      width: width,
      align: "left",
    });
  }
};
