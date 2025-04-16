import { accountingSupplierParty } from "../components/accountingSupplierParty";
import { accountingCustomerParty } from "../components/accountingCustomerParty";
import { dateFormatOnlyDate } from "../../../formatters/dateformatters";
import { addDaysToDate } from "../../../calculations/dates/addToDate";

export const purchaseToXml = (
  document: any,
  pdf?: {
    filename: string;
    content: Buffer;
    contentType: string;
  }
) => {
  try {
    const filename = `xml_${document.type}_${document.prefix ?? ""}${document.number.replaceAll("\\", "").replaceAll("/", "").replaceAll(" ", "")}_${
      document.id
    }.xml`;

    const establishment = document.establishment;
    const supplier = document.supplier;

    // Convert string values to numbers consistently
    const documentProducts = document.products;

    let taxRates: any[] = [];

    // First collect unique tax rates
    documentProducts.forEach((product: { tax: any }) => {
      if (!taxRates.includes(Number(product.tax))) {
        taxRates.push(Number(product.tax));
      }
    });

    // Calculate totals with explicit number conversion
    taxRates = taxRates.map((tax) => {
      const totalBeforeTax = documentProducts.reduce((acc: number, product: { tax: any; totalWithTaxAfterReduction: any }) => {
        if (Number(product.tax) === tax) {
          const subTotal = Number(product.totalWithTaxAfterReduction);
          return acc + subTotal / (1 + tax / 100);
        }
        return acc;
      }, 0);

      const totalTax = documentProducts.reduce((acc: number, product: { tax: any; totalWithTaxAfterReduction: any }) => {
        if (Number(product.tax) === tax) {
          const subTotal = Number(product.totalWithTaxAfterReduction);
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

    const total = Number(
      documentProducts.reduce((acc: number, product: { totalWithTaxAfterReduction: any }) => acc + Number(product.totalWithTaxAfterReduction), 0).toFixed(2)
    );

    const totalBeforeTax = Number((total - totalTax).toFixed(2));

    // Add validation
    if (isNaN(total) || isNaN(totalBeforeTax) || isNaN(totalTax)) {
      console.error(
        "Calculation error purchase:",
        JSON.stringify({
          documentNumber: document.number,
          values: {
            total,
            totalBeforeTax,
            totalTax,
            taxRates,
            documentProducts: documentProducts.map((p: { totalWithTaxAfterReduction: any; tax: any }) =>
              JSON.stringify({
                ...p,
                subTotal: Number(p.totalWithTaxAfterReduction),
                tax: Number(p.tax),
              })
            ),
          },
        })
      );
    }

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
  <cbc:CustomizationID>1.0</cbc:CustomizationID>
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
    ${
      pdf
        ? `<cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="application/pdf" filename="${pdf.filename}">
      ${pdf.content.toString("base64")}
      </cbc:EmbeddedDocumentBinaryObject>
  </cac:Attachment>`
        : ``
    }
  </cac:AdditionalDocumentReference>
  ${accountingSupplierParty({
    supplierParty: {
      name: supplier.name,
      taxID: supplier.taxID,
      email: supplier.contactMail ?? "",
      address: supplier.address,
    },
  })}
   ${accountingCustomerParty({
     customerParty: {
       name: establishment.name,
       taxID: establishment.taxID,
       email: establishment.company.owner.email,
       address: establishment.address,
     },
   })}
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode listID="UN/ECE 4461" listName="Payment Means"
      listURI="http://docs.oasis-open.org/ubl/os-UBL-2.0-update/cl/gc/default/PaymentMeansCode-2.0.gc">
      1</cbc:PaymentMeansCode>
    <cbc:PaymentDueDate>${dateFormatOnlyDate(addDaysToDate(document.date, 15).toString())}</cbc:PaymentDueDate>
  </cac:PaymentMeans>
  ${taxRates
    .map((taxRate) => {
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
    })
    .join("")}
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">${Number(totalBeforeTax).toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">${Number(totalBeforeTax).toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${Number(total).toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">${Number(total).toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${documentProducts
    .map((docProd: { totalWithTaxAfterReduction: any; tax: any; name: any; amount: any }, i: number) => {
      let taxAmount = Number(docProd.totalWithTaxAfterReduction) - Number(docProd.totalWithTaxAfterReduction) / (1 + Number(docProd.tax) / 100);
      return `<cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:Note>${docProd.name
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;")}</cbc:Note>
    <cbc:InvoicedQuantity>${Number(docProd.amount)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">${(Number(docProd.totalWithTaxAfterReduction) - Number(taxAmount)).toFixed(2)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="EUR">${Number(taxAmount).toFixed(2)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="EUR">${(Number(docProd.totalWithTaxAfterReduction) - Number(taxAmount)).toFixed(2)}</cbc:TaxableAmount>        
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
    })
    .join("")}
</Invoice>`;
    return {
      content,
      filename,
    };
  } catch (error) {
    console.error("Error generating xml for purchase document: ", error);
    return {
      content: "",
      filename: "",
    };
  }
};
