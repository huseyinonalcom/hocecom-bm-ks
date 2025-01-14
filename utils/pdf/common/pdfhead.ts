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
  const columnCount = 10;
  const flexBoxHead = ({ flex, column }: { flex: number; column: number }) => flexBox({ pageSize: "A4", originY: pageTop, flex, column, columnCount });

  const imageBox = flexBoxHead({ flex: 4, column: 1 });
  if (logoBuffer) {
    doc.image(logoBuffer, pageLeft, pageTop, { height: 50, width: imageBox.width });
  } else {
    const response = await fetch(invoiceDoc.establishment.logo.url);
    logoBuffer = await Buffer.from(await response.arrayBuffer());
    doc.image(logoBuffer, pageLeft, pageTop, { height: 50, width: imageBox.width });
  }

  const establishmentDetailsBox = flexBoxHead({ flex: 3, column: 5 });
  doc.text(invoiceDoc.establishment.name, establishmentDetailsBox.x, establishmentDetailsBox.y, {
    width: establishmentDetailsBox.width,
    align: "left",
  });

  const invoiceDetailsBox = flexBoxHead({ flex: 3, column: 8 });
  doc.text("INVOICE", invoiceDetailsBox.x, invoiceDetailsBox.y, {
    width: invoiceDetailsBox.width,
    align: "right",
  });
};
