import { dateFormatBe } from "../../formatters/dateformatters";
import { formatCurrency } from "../../formatters/formatcurrency";

export const paymentsTable = ({ doc, x, y, payments }: { doc: any; x: number; y: number; payments: any[] }) => {
  doc
    .lineCap("butt")
    .moveTo(x, y)
    .lineTo(x + 230, y)
    .stroke("black");

  doc.fillColor("white").text("Payment History:", x + 10, y - 5);

  doc.fillColor("black");

  payments.forEach((payment, i) => {
    doc.text(dateFormatBe(payment.timestamp), x + 10, y + 20 * (i + 1));
    doc.text(payment.type, x + 85, y + 20 * (i + 1));
    doc.text(formatCurrency(Number(payment.value)), x + 150, y + 20 * (i + 1), {
      width: 80,
      align: "right",
    });
  });
};
