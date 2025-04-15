import { KeystoneContext } from "@keystone-6/core/types";

export async function fetchCompany(companyID: string, context: KeystoneContext) {
  let company;
  await context
    .sudo()
    .query.Company.findOne({
      query: "id name einvoiceEmailIncoming einvoiceEmailOutgoing logo { url } emailHost emailPort emailUser emailPassword",
      where: { id: companyID },
    })
    .then((res) => {
      company = res;
    });

  return company;
}
