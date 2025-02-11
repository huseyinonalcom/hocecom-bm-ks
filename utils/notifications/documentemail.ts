import { generateCreditNoteOut } from "../pdf/document/creditnotepdf";
import { generateInvoiceOut } from "../pdf/document/invoicepdf";
import { sendMail } from "../sendmail";

export const sendDocumentEmail = async ({ documentId, context }: { documentId: string; context: any }) => {
  const postedDocument = await context.sudo().query.Document.findOne({
    where: { id: documentId },
    query:
      "prefix number extras date externalId currency origin totalTax totalPaid extras totalToPay total deliveryDate type payments { value timestamp type } products { name reduction description price amount totalTax totalWithTaxAfterReduction tax } delAddress { street door zip city floor province country } docAddress { street door zip city floor province country } customer { email email2 firstName lastName phone customerCompany preferredLanguage customerTaxNumber } establishment { name bankAccount1 bankAccount2 bankAccount3 taxID phone documentExtras phone2 company { emailHost emailPort emailUser emailPassword emailUser } address { street door zip city floor province country } logo { url } }",
  });
  if (postedDocument.type == "invoice" || postedDocument.type == "credit_note") {
    let bcc;
    if (postedDocument.customer.email2 && postedDocument.customer.email2 != "") {
      bcc = postedDocument.customer.email2;
    }
    let attachment;
    if (postedDocument.type == "invoice") {
      attachment = await generateInvoiceOut({ document: postedDocument });
    } else if (postedDocument.type == "credit_note") {
      attachment = await generateCreditNoteOut({ document: postedDocument });
    }
    sendMail({
      establishment: postedDocument.establishment,
      recipient: postedDocument.customer.email.split("+")[0] + "@" + postedDocument.customer.email.split("@")[1],
      bcc,
      subject: `Document ${postedDocument.prefix ?? ""}${postedDocument.number}`,
      company: postedDocument.establishment.company,
      attachments: [attachment],
      html: `<p>Beste ${
        postedDocument.customer!.firstName + " " + postedDocument.customer!.lastName
      },</p><p>In bijlage vindt u het document voor ons recentste transactie.</p><p>Met vriendelijke groeten.</p><p>${postedDocument.establishment.name}</p>`,
    });
  }
};
