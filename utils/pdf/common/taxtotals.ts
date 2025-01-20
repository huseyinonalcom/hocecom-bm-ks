import { formatCurrency } from "../../formatters/formatcurrency";
import { t } from "../../localization/localization";

export const taxTable = ({ doc, x, endY, document }: { doc: any; x: number; endY: number; document: any }) => {
  const tr = (key: string): string => t(key, document.customer!.preferredLanguage);
  let taxRates: number[] = [];

  const documentProducts = document.products;

  documentProducts.forEach((docProd: { tax: number }, i: any) => {
    if (!taxRates.includes(docProd.tax)) {
      taxRates.push(docProd.tax);
    }
  });

  taxRates = taxRates.sort((a, b) => a - b);

  taxRates.map((taxRate, index) => {
    doc.text(`${tr("total-tax")} ` + Number(taxRate).toFixed(0) + "%:", x, endY - index * 15).text(
      formatCurrency(
        documentProducts.filter((dp: { tax: number }) => dp.tax === taxRate).reduce((acc: number, dp: { totalTax: any }) => acc + Number(dp.totalTax), 0),
        document.currency
      ),
      x + 80,
      endY - index * 15,
      {
        align: "right",
        width: 60,
      }
    );
  });

  return endY - taxRates.length * 15;
};
