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
      query: "id",
      where: { id: companyID },
    })
    .then((res) => {
      company = res;
    });

  return company;
}

async function fetchDocuments(companyID: number, docTypes: string[], month: number, year: number, context: KeystoneContext): Promise<Document[]> {
  let documents: Document[] = [];
  let page = 1;
  let limit = 400;
  let allDocumentsFetched = false;

  while (!allDocumentsFetched) {
    const fetchedDocuments = (
      await payload.find({
        collection: "documents",
        depth: 2,
        sort: "date",
        where: {
          company: {
            equals: companyID,
          },
          type: {
            in: docTypes,
          },
          date: {
            greater_than_equal: new Date(year, month - 1, 1),
            less_than: new Date(year, month, 1),
          },
        },
        overrideAccess: true,
        limit: limit,
        page: page,
      })
    ).docs;
    documents = documents.concat(fetchedDocuments as unknown as Document[]);
    page++;
    allDocumentsFetched = fetchedDocuments.length < limit;
  }

  return documents;
}

async function startBulkDocumentSenderWorker({ companyID, docTypes, month, year, context }: BulkDocumentSenderParameters): Promise<void> {
  const documents = await fetchDocuments(companyID, docTypes, month, year, context);
  if (documents.length === 0) {
    console.log("No documents found for companyID: ", companyID, "docTypes: ", docTypes, "month: ", month, "year: ", year);
    return;
  }
  const company = await fetchCompany(companyID, context);
  const workerData = { documents, company };

  new Worker(path.resolve(__dirname, "./bulkdocumentsenderworker.ts"), {
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
