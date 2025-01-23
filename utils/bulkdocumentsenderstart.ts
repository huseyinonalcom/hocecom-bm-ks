import { KeystoneContext } from "@keystone-6/core/types";
import { Worker } from "worker_threads";
import path from "path";

export interface BulkDocumentSenderParameters {
  companyID: number;
  docTypes: string[];
  month: number;
  year: number;
  context: KeystoneContext;
}

async function fetchCompany(companyID: number, context: KeystoneContext) {
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

function getMondayAndSundayTwoWeeksAgo(): { monday: Date; sunday: Date } {
  const today = new Date();

  const dayOfWeek = today.getDay();

  const mondayThisWeek = new Date(today);
  mondayThisWeek.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  const mondayTwoWeeksAgo = new Date(mondayThisWeek);
  mondayTwoWeeksAgo.setDate(mondayTwoWeeksAgo.getDate() - 21);

  const sundayTwoWeeksAgo = new Date(mondayTwoWeeksAgo);
  sundayTwoWeeksAgo.setDate(mondayTwoWeeksAgo.getDate() + 6);

  return { monday: mondayTwoWeeksAgo, sunday: sundayTwoWeeksAgo };
}

async function fetchDocuments(companyID: number, docTypes: string[], month: number, year: number, context: KeystoneContext): Promise<any[]> {
  const { monday, sunday } = getMondayAndSundayTwoWeeksAgo();
  monday.setHours(0, 0, 0, 10);
  sunday.setHours(23, 59, 59, 500);
  const fetchedDocuments = await context.sudo().query.Document.findMany({
    orderBy: [{ date: "asc" }],
    query:
      "id date type total number origin externalId prefix currency comments totalPaid totalTax references totalToPay value externalId origin taxIncluded deliveryDate files { id name url } creator { id email role firstName lastName name } customer { id email role customerCompany preferredLanguage customerTaxNumber firstName lastName name customerAddresses { id street door zip city floor province country } } delAddress { id street door zip city floor province country } docAddress { id street door zip city floor province country } payments { id value isDeleted isVerified reference type timestamp creator { id email role firstName lastName name } } supplier { id name taxId address { id street door zip city floor province country } } fromDocument { id type number creator { id email role firstName lastName name } } toDocument { id type number creator { id email role firstName lastName name } } products { id amount name tax price pricedBy description reduction totalWithTaxAfterReduction totalTax totalReduction product { id name tax price pricedBy } } establishment { id name phone phone2 taxID bankAccount1 bankAccount2 defaultCurrency bankAccount3 address { id street door zip city floor province country } logo { id url } }",
    where: {
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
      date: {
        gte: monday,
        lte: sunday,
      },
    },
  });
  return Array.from(fetchedDocuments);
}

async function startBulkDocumentSenderWorker({ companyID, docTypes, month, year, context }: BulkDocumentSenderParameters): Promise<void> {
  const documents = await fetchDocuments(companyID, docTypes, month, year, context);
  if (documents.length === 0) {
    console.info("No documents found for companyID: ", companyID, "docTypes: ", docTypes, "month: ", month, "year: ", year);
    return;
  }
  const company = await fetchCompany(companyID, context);
  const workerData = { documents, company };

  new Worker(path.resolve("./utils/bulkdocumentsenderworker.ts"), {
    execArgv: ["-r", "ts-node/register"],
    workerData,
  });
}

export const bulkSendDocuments = async ({ docTypes, context }: { docTypes: string[]; context: KeystoneContext }) => {
  try {
    let companiesWithMonthlyReportsActive = await context.sudo().query.Company.findMany({
      where: {
        monthlyReports: {
          equals: true,
        },
      },
    });
    let dateToSend = new Date();
    dateToSend.setDate(-1);
    for (let company of companiesWithMonthlyReportsActive) {
      startBulkDocumentSenderWorker({ companyID: company.id, docTypes, context, month: dateToSend.getMonth() + 1, year: dateToSend.getFullYear() });
    }
  } catch (error) {
    console.error("Error occurred while starting bulkdocumentsender with params: ", docTypes, "error: ", error);
  }
};
