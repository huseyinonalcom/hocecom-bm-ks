import { dateFormatBe } from "../../formatters/dateformatters";
import { formatCurrency } from "../../formatters/formatcurrency";

export const paymentsTable = ({ doc, x, yEnd, payments }: { doc: any; x: number; yEnd: number; payments: any[] }) => {
  doc.fontSize(8);
  payments.forEach((payment, i) => {
    doc.text(dateFormatBe(payment.timestamp), x, yEnd - 10 * (i + 1));
    doc.text(payment.type, x + 55, yEnd - 10 * (i + 1));
    doc.text(formatCurrency(Number(payment.value)), x + 150, yEnd - 10 * (i + 1), {
      width: 75,
      align: "right",
    });
  });
  doc.fontSize(10);
  doc.text("Payment History:", x, yEnd - 10 * payments.length - 15);
};
