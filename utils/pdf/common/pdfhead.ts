import { flexBox } from "./positioning";

export const pdfHead = async ({
  doc,
  invoiceDoc,
  logoBuffer,
  pageLeft,
  pageTop,
}: {
  doc: PDFKit.PDFDocument;
  invoiceDoc: any;
  logoBuffer?: Buffer;
  pageLeft: number;
  pageTop: number;
}) => {
  const columnCount = 11;
  const flexBoxHead = ({ flex, column }: { flex: number; column: number }) => flexBox({ pageSize: "A4", originY: pageTop + 5, flex, column, columnCount });

  const imageBox = flexBoxHead({ flex: 4, column: 1 });

  if (logoBuffer) {
    doc.image(logoBuffer, pageLeft, pageTop, { fit: [imageBox.width, 50] });
  } else {
    const response = await fetch(invoiceDoc.establishment.logo.url);
    logoBuffer = Buffer.from(await response.arrayBuffer());
    doc.image(logoBuffer, pageLeft, pageTop, { fit: [imageBox.width, 50] });
  }

  let establishmentDetailsBox = flexBoxHead({ flex: 3, column: 6 });
  establishmentDetailsBox.x += 20;
  establishmentDetailsBox.width -= 20;
  doc.fontSize(10).text(invoiceDoc.establishment.name, establishmentDetailsBox.x, establishmentDetailsBox.y, {
    width: establishmentDetailsBox.width,
    align: "left",
  });

  if (invoiceDoc.establishment.phone) {
    doc.text(invoiceDoc.establishment.phone, {
      width: establishmentDetailsBox.width,
    });
  }

  if (invoiceDoc.establishment.phone2) {
    doc.text(invoiceDoc.establishment.phone2, {
      width: establishmentDetailsBox.width,
    });
  }

  if (invoiceDoc.establishment.taxID) {
    doc.text(invoiceDoc.establishment.taxID, {
      width: establishmentDetailsBox.width,
    });
  }

  let invoiceDetailsBox = flexBoxHead({ flex: 3, column: 8 });

  const validDate = new Date(invoiceDoc.date);
  validDate.setDate(validDate.getDate() + 15);
  invoiceDetailsBox.x += 50;
  invoiceDetailsBox.width -= 20;
  doc
    .fontSize(20)
    .text("INVOICE", invoiceDetailsBox.x + 5, invoiceDetailsBox.y, {
      width: invoiceDetailsBox.width - 5,
      align: "right",
    })
    .fontSize(10)
    .text("Invoice: " + invoiceDoc.prefix + invoiceDoc.number, invoiceDetailsBox.x, invoiceDetailsBox.y + 20, {
      width: invoiceDetailsBox.width,
      align: "left",
    })
    .text("Date: " + new Date(invoiceDoc.date).toLocaleDateString("fr-be"), {
      width: invoiceDetailsBox.width,
      align: "left",
    });

  doc.text("Valid Until: " + validDate.toLocaleDateString("fr-be"), {
    width: invoiceDetailsBox.width,
    align: "left",
  });

  if (invoiceDoc.deliveryDate) {
    doc.text("Delivery Date: " + new Date(invoiceDoc.deliveryDate).toLocaleDateString("fr-be"), {
      width: invoiceDetailsBox.width,
      align: "left",
    });
  }

  if (invoiceDoc.origin) {
    doc.text("External Service: " + invoiceDoc.origin, {
      width: invoiceDetailsBox.width,
      align: "left",
    });
  }
  if (invoiceDoc.externalId) {
    doc.text("External ID: " + invoiceDoc.externalId, {
      width: invoiceDetailsBox.width,
      align: "left",
    });
  }
};
