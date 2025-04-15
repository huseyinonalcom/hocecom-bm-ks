import { Party, party } from "./party";

export const accountingCustomerParty = ({ customerParty }: { customerParty: Party }): string => {
  return `<cac:AccountingCustomerParty>
        ${party({
          party: {
            name: customerParty.name,
            taxID: customerParty.taxID,
            email: customerParty.email ?? "",
            address: customerParty.address,
          },
        })}
    </cac:AccountingCustomerParty>`;
};
