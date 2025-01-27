import { t } from "../../localization/localization";

export const pdfDeliveryDetails = ({
  doc,
  document: invoiceDoc,
  x,
  y,
  width,
}: {
  doc: PDFKit.PDFDocument;
  document: any;
  x: number;
  y: number;
  width: number;
}) => {
  const tr = (key: string): string => {
    try {
      return t(key, invoiceDoc.customer!.preferredLanguage);
    } catch (e) {
      return key;
    }
  };
  const address = invoiceDoc.delAddress;
  doc.fontSize(10).text(`${tr("delivery")}: `, x, y, {
    width: width,
    align: "left",
  });

  doc.text(address.street + " " + address.door, {
    width: width,
    align: "left",
  });

  if (address.floor) {
    doc.text(`${tr("floor")}: ` + address.floor, {
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
