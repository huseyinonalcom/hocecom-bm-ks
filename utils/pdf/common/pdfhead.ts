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
  const flexBoxHead = ({ flex, column }: { flex: number; column: number }) => flexBox({ pageSize: "A4", originY: pageTop, flex, column, columnCount });

  const imageBox = flexBoxHead({ flex: 4, column: 1 });

  if (logoBuffer) {
    doc.image(logoBuffer, pageLeft, pageTop, { fit: [imageBox.width, 50] });
  } else {
    const response = await fetch(invoiceDoc.establishment.logo.url);
    logoBuffer = Buffer.from(await response.arrayBuffer());
    doc.image(logoBuffer, pageLeft, pageTop, { fit: [imageBox.width, 50] });
  }

  const establishmentDetailsBox = flexBoxHead({ flex: 3, column: 6 });

  doc
    .fontSize(10)
    .text(invoiceDoc.establishment.name, establishmentDetailsBox.x, establishmentDetailsBox.y, {
      width: establishmentDetailsBox.width,
      align: "left",
    })
    .text(invoiceDoc.establishment.phone, {
      width: establishmentDetailsBox.width,
    })
    .text(invoiceDoc.establishment.phone2, {
      width: establishmentDetailsBox.width,
    })
    .text(invoiceDoc.establishment.taxID, {
      width: establishmentDetailsBox.width,
    });

  const invoiceDetailsBox = flexBoxHead({ flex: 3, column: 8 });

  const validDate = new Date(invoiceDoc.date);
  validDate.setDate(validDate.getDate() + 15);

  doc
    .fontSize(20)
    .text("INVOICE", invoiceDetailsBox.x + 35, invoiceDetailsBox.y, {
      width: invoiceDetailsBox.width - 35,
      align: "right",
    })
    .fontSize(10)
    .text("Invoice: " + invoiceDoc.prefix + invoiceDoc.number, invoiceDetailsBox.x + 45, invoiceDetailsBox.y + 20, {
      width: invoiceDetailsBox.width - 45,
      align: "left",
    })
    .text("Date: " + new Date(invoiceDoc.date).toLocaleDateString("fr-be"), {
      width: invoiceDetailsBox.width - 45,
      align: "left",
    });

  doc.text("Valid Until: " + validDate.toLocaleDateString("fr-be"), {
    width: invoiceDetailsBox.width - 45,
    align: "left",
  });

  if (invoiceDoc.deliveryDate) {
    doc.text("Delivery Date: " + new Date(invoiceDoc.deliveryDate).toLocaleDateString("fr-be"), {
      width: invoiceDetailsBox.width - 45,
      align: "left",
    });
  }

  if (invoiceDoc.origin) {
    doc.text("External Service: " + invoiceDoc.origin, {
      width: invoiceDetailsBox.width - 45,
      align: "left",
    });
  }
  if (invoiceDoc.externalId) {
    doc.text("External ID: " + invoiceDoc.externalId, {
      width: invoiceDetailsBox.width - 45,
      align: "left",
    });
  }
};
