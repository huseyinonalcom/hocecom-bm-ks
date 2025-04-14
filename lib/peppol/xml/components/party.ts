import { countryNameToAbbreviation } from "../../../countries";
import { sanitizeText } from "../utils/sanitization";
import { Address } from "../../types/Address";

export interface Party {
  name: string;
  taxID?: string;
  email: string;
  address: Address;
}

// TODO: make it work with countries other than Belgium

export const party = ({ party }: { party: Party }): string => {
  const taxIDCleaned = ({ taxID }: { taxID: string }) => {
    return taxID.replace("BE", "").replaceAll(".", "").trim();
  };

  return `
    <cac:Party>
            ${
              party.taxID
                ? `
                <cbc:EndpointID schemeID="BE:CBE">${taxIDCleaned({ taxID: party.taxID })}</cbc:EndpointID>
                <cac:PartyIdentification>
                    <cbc:ID schemeAgencyID="BE" schemeAgencyName="KBO" schemeURI="http://www.e-fff.be/KBO">${taxIDCleaned({ taxID: party.taxID })}</cbc:ID>
                </cac:PartyIdentification>
                <cac:PartyTaxScheme>
                    <cbc:CompanyID>${party.taxID.replaceAll(".", "").replaceAll(" ", "")}</cbc:CompanyID>
                    <cac:TaxScheme>
                        <cbc:ID>VAT</cbc:ID>
                    </cac:TaxScheme>
                </cac:PartyTaxScheme>
                <cac:PartyLegalEntity>
                    <cbc:RegistrationName>${sanitizeText(party.name)}</cbc:RegistrationName>
                    <cbc:CompanyID schemeID="BE:CBE">${taxIDCleaned({ taxID: party.taxID })}</cbc:CompanyID>
                </cac:PartyLegalEntity>               
                `
                : ``
            }
            <cac:PartyName>
                <cbc:Name>${sanitizeText(party.name)}</cbc:Name>
            </cac:PartyName>
            <cac:PostalAddress>
                <cbc:StreetName>${sanitizeText(party.address.street ?? "")}</cbc:StreetName>
                <cbc:BuildingNumber>${sanitizeText(party.address.door ?? "")}</cbc:BuildingNumber>
                <cbc:CityName>${sanitizeText(party.address.city ?? "")}</cbc:CityName>
                <cbc:PostalZone>${sanitizeText(party.address.zip ?? "")}</cbc:PostalZone>
                <cac:Country>
                    <cbc:IdentificationCode>${countryNameToAbbreviation(party.address.country)}</cbc:IdentificationCode>
                    <cbc:Name>${sanitizeText(party.address.country)}</cbc:Name>
                </cac:Country>
            </cac:PostalAddress>
            <cac:Contact>
                <cbc:Name>${sanitizeText(party.name)}</cbc:Name>
                <cbc:ElectronicMail>${sanitizeText(party.email)}</cbc:ElectronicMail>
            </cac:Contact>
        </cac:Party>
    `;
};
