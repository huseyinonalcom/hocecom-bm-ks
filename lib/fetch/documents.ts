import { getMondayAndSundayTwoWeeksAgo } from "../calculations/dates/getStartAndEnd";
import { KeystoneContext } from "@keystone-6/core/types";

const fetchDocumentQuery =
  "id date type total number origin externalId prefix currency comments totalPaid totalTax references totalToPay value externalId origin taxIncluded deliveryDate files { id name url } creator { id email role firstName lastName name } customer { id email role customerCompany preferredLanguage customerTaxNumber firstName lastName name customerAddresses { id street door zip city floor province country } } delAddress { id street door zip city floor province country } docAddress { id street door zip city floor province country } payments { id value isDeleted isVerified reference type timestamp creator { id email role firstName lastName name } } supplier { id name taxId contactMail address { id street door zip city floor province country } } fromDocument { id type number creator { id email role firstName lastName name } } toDocument { id type number creator { id email role firstName lastName name } } products { id amount name tax price pricedBy description reduction totalWithTaxAfterReduction totalTax totalReduction product { id name tax price pricedBy } } establishment { id name phone phone2 taxID bankAccount1 bankAccount2 defaultCurrency bankAccount3 address { id street door zip city floor province country } logo { id url } company { owner { email } } }";

export async function fetchDocuments({
  companyID,
  docTypes,
  month,
  year,
  all,
  context,
}: {
  companyID: string;
  docTypes: string[];
  month?: number;
  year?: number;
  all?: boolean;
  context: KeystoneContext;
}): Promise<any[]> {
  let where: Record<string, any> = {
    company: {
      id: {
        equals: companyID,
      },
    },
    isDeleted: {
      equals: false,
    },
    type: {
      in: docTypes,
    },
  };

  if (!all) {
    const { monday, sunday } = getMondayAndSundayTwoWeeksAgo();
    monday.setHours(0, 0, 0, 10);
    sunday.setHours(23, 59, 59, 500);
    where = {
      ...where,
      date: {
        gte: monday,
        lte: sunday,
      },
    };
  }
  let fetchedDocuments: any[] = [];
  let round = 0;
  let keepGoing = true;
  const fetchedDocumentsPer = 50;
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  while (keepGoing) {
    await sleep(1000);
    try {
      let documents = await context.sudo().query.Document.findMany({
        orderBy: [{ date: "asc" }],
        take: fetchedDocumentsPer,
        skip: round * fetchedDocumentsPer,
        query: fetchDocumentQuery,
        where: where,
      });
      fetchedDocuments = fetchedDocuments.concat(documents);
      keepGoing = documents.length > 0;
      round++;
    } catch (error) {
      console.error("Error fetching documents: ", error);
      keepGoing = false;
    }
  }

  return Array.from(fetchedDocuments);
}

export async function fetchDocumentByID({ documentID, context, sudo = false }: { documentID: string; context: KeystoneContext; sudo?: boolean }): Promise<any> {
  let fetchedDocument;
  try {
    if (sudo) {
      fetchedDocument = await context.sudo().query.Document.findOne({
        query: fetchDocumentQuery,
        where: {
          id: documentID,
        },
      });
    } else {
      fetchedDocument = await context.query.Document.findOne({
        query: fetchDocumentQuery,
        where: {
          id: documentID,
        },
      });
    }
  } catch (e) {
    console.error(e);
  }
  return fetchedDocument;
}
