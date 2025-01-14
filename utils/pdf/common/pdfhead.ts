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
  if (logoBuffer) {
    doc.image(logoBuffer, pageLeft, pageTop, { height: 50 });
  } else {
    const response = await fetch(invoiceDoc.establishment.logo.url);
    logoBuffer = await Buffer.from(await response.arrayBuffer());
    doc.image(logoBuffer, pageLeft, pageTop, { height: 50 });
  }
  
};
