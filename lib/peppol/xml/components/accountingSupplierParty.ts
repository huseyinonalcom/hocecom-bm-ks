import { Party, party } from "./party";

export const accountingSupplierParty = ({ supplierParty }: { supplierParty: Party }): string => {
  return `
    <cac:AccountingSupplierParty>
        ${party({
          party: supplierParty,
        })}
    </cac:AccountingSupplierParty>
  `;
};
