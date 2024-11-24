import path from "path";
import payload from "payload";
import { Worker } from "worker_threads";

export interface BulkDocumentSenderParameters {
  companyID: number;
  docTypes: string[];
  month: number;
  year: number;
}

async function fetchCompany(companyID: number) {
  let company;
  await payload
    .findByID({
      collection: "companies",
      id: companyID,
      depth: 1,
      overrideAccess: true,
    })
    .then((res) => {
      company = res;
    });
  return company;
}

async function fetchDocuments(companyID: number, docTypes: string[], month: number, year: number): Promise<Document[]> {
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

async function startBulkDocumentSenderWorker({ companyID, docTypes, month, year }: BulkDocumentSenderParameters): Promise<void> {
  const documents = await fetchDocuments(companyID, docTypes, month, year);
  if (documents.length === 0) {
    console.log("No documents found for companyID: ", companyID, "docTypes: ", docTypes, "month: ", month, "year: ", year);
    return;
  }
  const company = await fetchCompany(companyID);
  const workerData = { documents, company };

  new Worker(path.resolve(__dirname, "./bulkdocumentsenderworker.ts"), {
    execArgv: ["-r", "ts-node/register"],
    workerData,
  });
}

export const bulkSendDocuments = ({ companyID, docTypes, month, year }: BulkDocumentSenderParameters) => {
  try {
    startBulkDocumentSenderWorker({ companyID, docTypes, month, year });
  } catch (error) {
    console.error("Error occurred while starting bulkdocumentsender with params: ", companyID, docTypes, month, year, "error: ", error);
  }
};
