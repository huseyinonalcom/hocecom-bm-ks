import { t } from "../../localization/localization";
import { flexBox } from "./positioning";

export const pdfHead = async ({
  doc,
  document,
  logoBuffer,
  pageLeft,
  pageTop,
}: {
  doc: PDFKit.PDFDocument;
  document: any;
  logoBuffer?: Buffer;
  pageLeft: number;
  pageTop: number;
}) => {
  const tr = (key: string): string => {
    try {
      return t(key, document.customer!.preferredLanguage);
    } catch (e) {
      return key;
    }
  };
  const columnCount = 11;
  const flexBoxHead = ({ flex, column }: { flex: number; column: number }) => flexBox({ pageSize: "A4", originY: pageTop + 5, flex, column, columnCount });

  const imageBox = flexBoxHead({ flex: 4, column: 1 });

  if (logoBuffer) {
    doc.image(logoBuffer, pageLeft, pageTop, { fit: [imageBox.width, 50] });
  } else {
    const response = await fetch(document.establishment.logo.url);
    logoBuffer = Buffer.from(await response.arrayBuffer());
    doc.image(logoBuffer, pageLeft, pageTop, { fit: [imageBox.width, 50] });
  }

  let establishmentDetailsBox = flexBoxHead({ flex: 3, column: 6 });
  establishmentDetailsBox.x += 20;
  establishmentDetailsBox.width -= 20;
  doc.fontSize(10).text(document.establishment.name, establishmentDetailsBox.x, establishmentDetailsBox.y, {
    width: establishmentDetailsBox.width,
    align: "left",
  });

  if (document.establishment.phone) {
    doc.text(document.establishment.phone, {
      width: establishmentDetailsBox.width,
    });
  }

  if (document.establishment.phone2) {
    doc.text(document.establishment.phone2, {
      width: establishmentDetailsBox.width,
    });
  }

  if (document.establishment.taxID) {
    doc.text(document.establishment.taxID, {
      width: establishmentDetailsBox.width,
    });
  }

  let invoiceDetailsBox = flexBoxHead({ flex: 3, column: 8 });

  const validDate = new Date(document.date);
  validDate.setDate(validDate.getDate() + 15);
  invoiceDetailsBox.x += 50;
  invoiceDetailsBox.width -= 20;
  doc
    .fontSize(20)
    .text(tr(document.type).toUpperCase(), invoiceDetailsBox.x + 5, invoiceDetailsBox.y, {
      width: invoiceDetailsBox.width - 5,
      align: "right",
    })
    .fontSize(10)
    .text(`${tr(document.type)}: ` + document.prefix + document.number, invoiceDetailsBox.x, invoiceDetailsBox.y + 20, {
      width: invoiceDetailsBox.width,
      align: "left",
    })
    .text(`${tr("date")}: ` + new Date(document.date).toLocaleDateString("fr-be"), {
      width: invoiceDetailsBox.width,
      align: "left",
    });

  if (document.type == "invoice") {
    doc.text(`${tr("valid-until")}: ` + validDate.toLocaleDateString("fr-be"), {
      width: invoiceDetailsBox.width,
      align: "left",
    });
    if (document.deliveryDate) {
      doc.text(`${tr("date-dispatch")}: ` + new Date(document.deliveryDate).toLocaleDateString("fr-be"), {
        width: invoiceDetailsBox.width,
        align: "left",
      });
    }

    if (document.origin) {
      doc.text(`${tr("origin")}: ` + document.origin, {
        width: invoiceDetailsBox.width,
        align: "left",
      });
    }
    if (document.externalId) {
      doc.text(`${tr("external-id")}: ` + document.externalId, {
        width: invoiceDetailsBox.width,
        align: "left",
      });
    }
  }
};
