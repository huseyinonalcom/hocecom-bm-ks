import { t } from "../../localization/localization";

export const pdfPaymentDetails = ({ doc, document: invoiceDoc, x, y, width }: { doc: PDFKit.PDFDocument; document: any; x: number; y: number; width: number }) => {
  const tr = (key: string): string => {
    try {
      return t(key, invoiceDoc.customer!.preferredLanguage);
    } catch (e) {
      return key;
    }
  };
  const establishment = invoiceDoc.establishment;
  const address = establishment.address;
  doc.fontSize(10).text(address.street + " " + address.door, x, y, {
    width: width,
    align: "left",
  });

  if (address.floor) {
    doc.text("Floor: " + address.floor, {
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

  if (establishment.bankAccount1) {
    doc.text(establishment.bankAccount1, {
      width: width,
      align: "left",
    });
  }

  if (establishment.bankAccount2) {
    doc.text(establishment.bankAccount2, {
      width: width,
      align: "left",
    });
  }

  if (establishment.bankAccount3) {
    doc.text(establishment.bankAccount3, {
      width: width,
      align: "left",
    });
  }

  return doc.y;
};
