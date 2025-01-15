import { formatCurrency } from "../../formatters/formatcurrency";
import { flexBox } from "./positioning";

const generateTableRow = (
  doc: any,
  y: number,
  name: string,
  description: string,
  price: string,
  amount: string,
  reduction: string,
  tax: string,
  subtotal: string,
  isHeader = false
) => {
  const pageSize = "A4";
  const columnCount = 18;
  const flexBoxTableRow = ({ flex, column }: { flex: number; column: number }) => flexBox({ pageSize, originY: y, flex, column, columnCount });
  const nameBox = flexBoxTableRow({ flex: 4, column: 1 });
  if (isHeader) {
    doc.lineWidth(17);
    const bgY = y + 4;
    doc.lineCap("butt").moveTo(20, bgY).lineTo(575, bgY).stroke("black");
  }
  let newY = nameBox.y;
  doc
    .fontSize(9)
    .fillColor(isHeader ? "white" : "black")
    .text(name, nameBox.x + 25, nameBox.y, { width: nameBox.width - 35, align: "left" });
  if (doc.y > newY) {
    newY = doc.y;
  }
  doc.text(description, 125, nameBox.y, { width: 90, align: "left" });
  if (doc.y > newY) {
    newY = doc.y;
  }
  doc.text(price, 225, nameBox.y, { width: 70, align: "left" });
  if (doc.y > newY) {
    newY = doc.y;
  }
  doc.text(amount, 300, nameBox.y, { width: 50, align: "left" });
  if (doc.y > newY) {
    newY = doc.y;
  }
  doc.text(reduction, 365, nameBox.y, { width: 50, align: "left" });
  if (doc.y > newY) {
    newY = doc.y;
  }
  doc.text(tax, 425, nameBox.y, { width: 70, align: "left" });
  if (doc.y > newY) {
    newY = doc.y;
  }
  doc.text(subtotal, 500, nameBox.y, { width: 65, align: "left" });
  if (doc.y > newY) {
    newY = doc.y;
  }

  if (!isHeader) {
    doc.lineWidth(1);
    doc.lineCap("butt").moveTo(20, newY).lineTo(575, newY).stroke("black");
  }

  return newY + 5;
};

export const generateInvoiceTable = (doc: any, documentProducts: any[], y: number) => {
  let invoiceTableTop = y + 5;
  let showReduction = false;
  if (documentProducts.find((dp) => dp.reduction && Number(dp.reduction) > 0)) {
    showReduction = true;
  }
  let position = generateTableRow(doc, invoiceTableTop, "Name", "Description", "Price", "Amount", showReduction ? "Reduction" : "", "Tax", "Subtotal", true);
  for (let i = 0; i < documentProducts.length; i++) {
    const item = documentProducts[i];
    position = generateTableRow(
      doc,
      position,
      item.name,
      item.description,
      formatCurrency(Number(item.price)),
      Number(item.amount).toFixed(2),
      showReduction ? Number(item.reduction).toFixed(2) + "%" : "",
      formatCurrency(Number(item.totalTax)),
      formatCurrency(Number(item.totalWithTaxAfterReduction))
    );
  }
  return doc.y;
};
