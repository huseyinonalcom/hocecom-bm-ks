import { KeystoneContext } from "@keystone-6/core/types";
import { fetchDocuments } from "../../fetch/documents";
import { fetchCompany } from "../../fetch/company";
import { Worker } from "worker_threads";
import path from "path";

export interface BulkDocumentSenderParameters {
  context: KeystoneContext;
  docTypes: string[];
  companyID: string;
  month: number;
  year: number;
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

async function startBulkDocumentSenderWorker({ companyID, docTypes, month, year, context }: BulkDocumentSenderParameters): Promise<void> {
  const documents = await fetchDocuments({
    companyID,
    docTypes,
    month,
    year,
    context,
  });

  if (documents.length === 0) {
    console.info("No documents found for companyID: ", companyID, "docTypes: ", docTypes, "month: ", month, "year: ", year);
    return;
  }

  const company = await fetchCompany(companyID, context);

  const workerData = { documents, company };

  new Worker(path.resolve("./lib/automation/documents/bulkdocumentsenderworker.ts"), {
    execArgv: ["-r", "ts-node/register"],
    workerData,
  });
}
