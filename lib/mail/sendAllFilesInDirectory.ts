import path from "node:path";
import { sendSystemEmail } from "./sendsystememail";
import { readdir, stat } from "node:fs/promises";

// Maximum size for email attachments (in bytes) - 7MB
const MAX_EMAIL_SIZE = 7 * 1024 * 1024;

export const sendAllFilesInDirectory = async ({ recipient, dirPath }: { recipient: string; dirPath: string }) => {
  try {
    // Read all files in the directory
    const files = await readdir(dirPath);

    // Get file sizes and paths
    const fileDetails = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(dirPath, file);
        const stats = await stat(filePath);

        return {
          path: filePath,
          size: stats.size,
          name: file,
        };
      })
    );

    // Group files into batches of maximum 7MB
    const batches = [];
    let currentBatch = [];
    let currentBatchSize = 0;

    for (const file of fileDetails) {
      // If adding this file would exceed the size limit, start a new batch
      if (currentBatchSize + file.size > MAX_EMAIL_SIZE && currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentBatchSize = 0;
      }

      // If a single file is larger than the limit, it gets its own batch
      if (file.size > MAX_EMAIL_SIZE) {
        console.warn(`File ${file.name} exceeds the 7MB limit and may not be sent properly`);
      }

      // Add file to current batch
      currentBatch.push({ path: file.path });
      currentBatchSize += file.size;
    }

    // Add the last batch if not empty
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    // Send emails for each batch
    for (let i = 0; i < batches.length; i++) {
      await sendEmailWithAttachments(batches[i], recipient);

      // Add a small delay between emails to avoid rate limiting
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return {
      success: true,
      fileCount: fileDetails.length,
      batchCount: batches.length,
    };
  } catch (error) {
    console.error("Error sending files from directory:", error);
    return {
      success: false,
      error: error,
    };
  }
};

async function sendEmailWithAttachments(
  attachments: {
    path: string;
  }[],
  recipient: string
): Promise<void> {
  await sendSystemEmail({
    recipient: recipient,
    subject: `Documenten`,
    attachments: attachments.map((attachment) => {
      return {
        filename: attachment.path.replaceAll("\\", "/").split("/").at(-1),
        path: attachment.path,
      };
    }),

    html: `<p>Beste, in bijlage alle gevraagde documenten.</p>`,
  });
}
