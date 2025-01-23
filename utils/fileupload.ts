import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import "dotenv/config";

const s3Client = new S3Client({
  region: process.env.REGION as string,
  endpoint: process.env.STORAGE_URL as string,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID as string,
    accountId: process.env.ACCOUNT_ID as string,
    secretAccessKey: process.env.SECRET_ACCESS_KEY as string,
  },
});

export const fileUpload = async (file: { originalname: any; buffer: any; mimetype: any }) => {
  const randomString = Math.random().toString(36).substring(2, 15);
  const fileName = file.originalname;
  let sanitizedFileName = fileName.replaceAll(" ", "").replaceAll("/", "").replaceAll("\\", "");
  const newFileName = `${Date.now()}-${randomString}-${sanitizedFileName}`;
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: `uploads/${newFileName}`,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    return {
      success: true,
      fileUrl: `${process.env.STORAGE_PUBLIC_URL}/${params.Key}`,
      fileName: newFileName,
    };
  } catch (error) {
    console.error("file upload error:", error);
    throw new Error("Failed to upload file");
  }
};
