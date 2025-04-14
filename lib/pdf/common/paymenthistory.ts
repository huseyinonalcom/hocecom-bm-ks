import { dateFormatBe } from "../../formatters/dateformatters";
import { formatCurrency } from "../../formatters/formatcurrency";
import { t } from "../../localization/localization";

export const paymentsTable = ({ doc, x, yEnd, payments, invoiceDoc }: { doc: any; x: number; yEnd: number; payments: any[]; invoiceDoc: any }) => {
  const tr = (key: string): string => {
    try {
      return t(key, invoiceDoc.customer!.preferredLanguage);
    } catch (e) {
      return key;
    }
  };
  doc.fontSize(8);
  payments.forEach((payment, i) => {
    doc.text(dateFormatBe(payment.timestamp), x, yEnd - 10 * (i + 1));
    doc.text(tr(payment.type), x + 55, yEnd - 10 * (i + 1));
    doc.text(formatCurrency(Number(payment.value), invoiceDoc.currency), x + 150, yEnd - 10 * (i + 1), {
      width: 75,
      align: "right",
    });
  });
  doc.fontSize(10);
  doc.text(`${tr("payment-history")}:`, x, yEnd - 10 * payments.length - 15);
};
