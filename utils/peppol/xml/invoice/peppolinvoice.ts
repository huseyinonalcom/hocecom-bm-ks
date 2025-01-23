import { dateFormatOnlyDate } from "../../../formatters/dateformatters";
import { addDaysToDate } from "../../../addtodate";

export const invoiceToXml = (
  document: any,
  pdf: {
    filename: string;
    content: Buffer;
    contentType: string;
  }
) => {
  const filename = `xml_${document.type}_${document.prefix ?? ""}${document.number.replaceAll("\\", "").replaceAll("/", "").replaceAll(" ", "")}.xml`;

  const establishment = document.establishment;
  const customer = document.customer;
  const docAddress = document.docAddress;

  // Convert string values to numbers consistently
  const documentProducts = document.products;

  let taxRates: any[] = [];

  // First collect unique tax rates
  documentProducts.forEach((product: any) => {
    if (!taxRates.includes(Number(product.tax))) {
      taxRates.push(Number(product.tax));
    }
  });

  // Calculate totals with explicit number conversion
  taxRates = taxRates.map((tax) => {
    const totalBeforeTax = documentProducts.reduce((acc: number, product: { tax: any; subTotal: any }) => {
      if (Number(product.tax) === tax) {
        const subTotal = Number(product.subTotal);
        return acc + subTotal / (1 + tax / 100);
      }
      return acc;
    }, 0);

    const totalTax = documentProducts.reduce((acc: number, product: { tax: any; subTotal: any }) => {
      if (Number(product.tax) === tax) {
        const subTotal = Number(product.subTotal);
        const beforeTax = subTotal / (1 + tax / 100);
        return acc + (subTotal - beforeTax);
      }
      return acc;
    }, 0);

    return {
      rate: tax,
      totalBeforeTax: Number(totalBeforeTax.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
    };
  });

  // Calculate final totals with explicit number conversion
  const totalTax = Number(taxRates.reduce((acc, taxRate) => acc + taxRate.totalTax, 0).toFixed(2));

  const total = Number(documentProducts.reduce((acc: number, product: { subTotal: any }) => acc + Number(product.subTotal), 0).toFixed(2));

  const totalBeforeTax = Number((total - totalTax).toFixed(2));

  // Add validation
  if (isNaN(total) || isNaN(totalBeforeTax) || isNaN(totalTax)) {
    console.error("Calculation error:", {
      documentNumber: document.number,
      values: {
        total,
        totalBeforeTax,
        totalTax,
        taxRates,
        documentProducts: documentProducts.map((p: { subTotal: any; tax: any }) => ({
          ...p,
          subTotal: Number(p.subTotal),
          tax: Number(p.tax),
        })),
      },
    });
  }

  const taxIdCleaned = establishment.taxID.replace("BE", "").replaceAll(".", "").trim();

  const content = `<?xml version="1.0" encoding="utf-8"?>
<Invoice xmlns:qdt="urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:xades="http://uri.etsi.org/01903/v1.3.2#"
  xmlns:udt="urn:un:unece:uncefact:data:draft:UnqualifiedDataTypesSchemaModule:2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:ccts="urn:oasis:names:specification:ubl:schema:xsd:CoreComponentParameters-2"
  xmlns:stat="urn:oasis:names:specification:ubl:schema:xsd:DocumentStatusCode-1.0"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#conformant#urn:UBL.BE:1.0.0.20180214</cbc:CustomizationID>
  <cbc:ProfileID>E-FFF.BE BILLIT.BE</cbc:ProfileID>
  <cbc:ID>${document.number}</cbc:ID>
  <cbc:CopyIndicator>false</cbc:CopyIndicator>
  <cbc:IssueDate>${dateFormatOnlyDate(document.date)}</cbc:IssueDate>
  <cbc:InvoiceTypeCode listURI="http://www.E-FFF.be/ubl/2.0/cl/gc/BE-InvoiceCode-1.0.gc">380</cbc:InvoiceTypeCode>
  <cbc:TaxPointDate>${dateFormatOnlyDate(document.date)}</cbc:TaxPointDate>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cac:AdditionalDocumentReference>
    <cbc:ID>${filename}</cbc:ID>
    <cbc:DocumentType>CommercialInvoice</cbc:DocumentType>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="application/pdf" filename="${pdf.filename}">
      ${pdf.content.toString("base64")}
      </cbc:EmbeddedDocumentBinaryObject>
  </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:EndpointID schemeID="BE:CBE">${taxIdCleaned}</cbc:EndpointID>
      <cac:PartyIdentification>
        <cbc:ID schemeAgencyID="BE" schemeAgencyName="KBO" schemeURI="http://www.e-fff.be/KBO">
          ${taxIdCleaned}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>BELANTRA</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>Bist</cbc:StreetName>
        <cbc:BuildingNumber>19</cbc:BuildingNumber>
        <cbc:CityName>Aartselaar</cbc:CityName>
        <cbc:PostalZone>2630</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>BE</cbc:IdentificationCode>
          <cbc:Name>België</cbc:Name>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${establishment.taxId.replaceAll(".", "").replaceAll(" ", "")}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>BELANTRA</cbc:RegistrationName>
        <cbc:CompanyID schemeID="BE:CBE">${taxIdCleaned}</cbc:CompanyID>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:Name>Ayfema</cbc:Name>
        <cbc:ElectronicMail>info@ayfema.com</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${customer.firstName + " " + customer.lastName}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${docAddress.street}</cbc:StreetName>
        <cbc:BuildingNumber>${docAddress.door}</cbc:BuildingNumber>
        <cbc:CityName>${docAddress.city}</cbc:CityName>
        <cbc:PostalZone>${docAddress.zip}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${docAddress.country}</cbc:IdentificationCode>
          <cbc:Name>${docAddress.country}</cbc:Name>
        </cac:Country>
      </cac:PostalAddress>
      <cac:Contact>
        <cbc:Name>${customer.firstName + " " + customer.lastName}</cbc:Name>
        <cbc:ElectronicMail>${customer.email}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode listID="UN/ECE 4461" listName="Payment Means"
      listURI="http://docs.oasis-open.org/ubl/os-UBL-2.0-update/cl/gc/default/PaymentMeansCode-2.0.gc">
      1</cbc:PaymentMeansCode>
    <cbc:PaymentDueDate>${dateFormatOnlyDate(addDaysToDate(document.date, 15).toString())}</cbc:PaymentDueDate>
    <cac:PayeeFinancialAccount>
      <cbc:ID schemeName="IBAN">BE07068937722366</cbc:ID>
      <cac:FinancialInstitutionBranch>
        <cac:FinancialInstitution>
          <cbc:ID schemeName="BIC">GKCCBEBB</cbc:ID>
        </cac:FinancialInstitution>
      </cac:FinancialInstitutionBranch>
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>
  ${taxRates.map((taxRate) => {
    return `<cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">${Number(taxRate.totalTax).toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="EUR">${Number(taxRate.totalBeforeTax).toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="EUR">${Number(taxRate.totalTax).toFixed(2)}</cbc:TaxAmount>
      <cbc:Percent>${taxRate.rate}</cbc:Percent>
      <cac:TaxCategory>
        <cbc:ID schemeID="UNCL5305" schemeName="Duty or tax or fee category">S</cbc:ID>
        <cbc:Name>OSS-S</cbc:Name>
        <cbc:Percent>${taxRate.rate}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
    </cac:TaxTotal>`;
  })}
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">${Number(totalBeforeTax).toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">${Number(totalBeforeTax).toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${Number(total).toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">${Number(total).toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${documentProducts.map((docProd: { subTotal: any; tax: any; name: string; amount: any }, i: number) => {
    let taxAmount = Number(docProd.subTotal) - Number(docProd.subTotal) / (1 + Number(docProd.tax) / 100);
    return `<cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:Note>${docProd.name
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;")}</cbc:Note>
    <cbc:InvoicedQuantity>${Number(docProd.amount)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">${(Number(docProd.subTotal) - Number(taxAmount)).toFixed(2)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="EUR">${Number(taxAmount).toFixed(2)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="EUR">${(Number(docProd.subTotal) - Number(taxAmount)).toFixed(2)}</cbc:TaxableAmount>        
        <cbc:TaxAmount currencyID="EUR">${Number(taxAmount).toFixed(2)}</cbc:TaxAmount>   
        <cbc:Percent>${Number(docProd.tax)}</cbc:Percent>   
        <cac:TaxCategory>
          <cbc:ID schemeID="UNCL5305" schemeName="Duty or tax or fee category">S</cbc:ID>
          <cbc:Name>OSS-S</cbc:Name>
          <cbc:Percent>${Number(docProd.tax)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Name>${docProd.name
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;")}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID schemeID="UNCL5305" schemeName="Duty or tax or fee category">S</cbc:ID>
        <cbc:Name>OSS-S</cbc:Name>
        <cbc:Percent>${Number(docProd.tax)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
  </cac:InvoiceLine>`;
  })}
</Invoice>`;

  return {
    content,
    filename,
  };
};
