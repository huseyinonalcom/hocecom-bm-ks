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
      query: "id name accountantEmail logo { url } emailHost emailPort emailUser emailPassword",
      where: { id: companyID },
    })
    .then((res) => {
      company = res;
    });

  return company;
}

async function fetchDocuments(companyID: number, docTypes: string[], month: number, year: number, context: KeystoneContext): Promise<any[]> {
  const fetchedDocuments = await context.sudo().query.Document.findMany({
    orderBy: [{ date: "desc" }],
    query:
      "id number establishment { taxID logo { url } } supplier { name address { street door zip city country } taxId } date files { url name } type products { name amount totalWithTaxAfterReduction tax }",
    where: {
      company: {
        id: {
          equals: companyID,
        },
      },
      type: {
        in: docTypes,
      },
      date: {
        gte: new Date(year, month - 1, 1),
        lte: new Date(year, month, 1),
      },
    },
  });
  return Array.from(fetchedDocuments);
}

async function startBulkDocumentSenderWorker({ companyID, docTypes, month, year, context }: BulkDocumentSenderParameters): Promise<void> {
  const documents = await fetchDocuments(companyID, docTypes, month, year, context);
  if (documents.length === 0) {
    console.log("No documents found for companyID: ", companyID, "docTypes: ", docTypes, "month: ", month, "year: ", year);
    return;
  }
  const company = await fetchCompany(companyID, context);
  const workerData = { documents, company };

  new Worker(path.resolve("./utils/bulkdocumentsenderworker.ts"), {
    execArgv: ["-r", "ts-node/register"],
    workerData,
  });
}

export const bulkSendDocuments = ({ companyID, docTypes, month, year, context }: BulkDocumentSenderParameters) => {
  try {
    startBulkDocumentSenderWorker({ companyID, docTypes, month, year, context });
  } catch (error) {
    console.error("Error occurred while starting bulkdocumentsender with params: ", companyID, docTypes, month, year, "error: ", error);
  }
};
