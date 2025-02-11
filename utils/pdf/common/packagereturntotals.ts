import { formatCurrency } from "../../formatters/formatcurrency";
import { t } from "../../localization/localization";

export const returnPackage = ({ doc, x, endY, document }: { doc: PDFKit.PDFDocument; x: number; endY: number; document: any }) => {
  const extraConfigReturnPackage = document.establishment?.documentExtras?.returnPackage ?? {};
  const documentExtras = document.extras?.values ?? [];
  const extrasParsed: { amount: number; price: number; value: number }[] = [];

  try {
    documentExtras.forEach((extra: any) => {
      if (extra.type === "returnPackage") {
        try {
          extrasParsed.push({
            amount: Number(extra.amount) || 0,
            price: Number(extra.price) || 0,
            value: Number(extra.value) || 0,
          });
        } catch (error) {
          console.error(error);
        }
      }
    });
  } catch (error) {
    console.error(error);
  }

  if (
    extraConfigReturnPackage.active === true &&
    extraConfigReturnPackage.documentTypes.includes(document.type) &&
    extrasParsed.length > 0 &&
    extrasParsed.some((extra) => extra.value > 0)
  ) {
    doc.fontSize(13).text(t("return-package", document.customer!.preferredLanguage), x, endY);

    let tableY = endY + 15;

    extrasParsed.forEach((extra, index) => {
      const rowY = tableY + index * 15;
      doc
        .fontSize(10)
        .text(extra.amount.toFixed(0), x, rowY, { align: "right", width: 30 })
        .text("x", x + 46, rowY)
        .text(formatCurrency(extra.price, document.currency ?? "EUR"), x + 58, rowY, { align: "right", width: 51 })
        .text("=", x + 112, rowY)
        .text(formatCurrency(extra.value, document.currency ?? "EUR"), x + 114, rowY, { align: "right", width: 62 });
    });

    const total = extrasParsed.reduce((sum, extra) => sum + extra.value, 0);
    doc
      .fontSize(14)
      .text(
        `${t("total", document.customer!.preferredLanguage)} =  ${formatCurrency(total, document.currency ?? "EUR")}`,
        x,
        tableY + extrasParsed.length * 15 + 5
      );

    return tableY + extrasParsed.length * 15 + 20;
  }

  return endY;
};
