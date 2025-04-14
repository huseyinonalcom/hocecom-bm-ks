export const sendSystemEmail = async ({
  recipient,
  subject,
  bcc,
  html,
  attachments,
}: {
  recipient: string;
  subject: string;
  bcc?: string;
  html: string;
  attachments?: any;
}) => {
  try {
    const nodemailer = require("nodemailer");

    let bc = "test@huseyinonal.com";
    if (bcc) {
      bc += ", " + bcc;
    }

    let transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    let mailOptionsClient = {
      from: `"${process.env.MAIL_USER}" <${process.env.MAIL_USER}>`,
      to: recipient,
      bcc: bc,
      attachments: attachments,
      subject: subject,
      html: html,
    };

    transporter.sendMail(mailOptionsClient, (error: any) => {
      if (error) {
        console.error("mail error", error);
        return false;
      } else {
        console.info("mail sent");
        return true;
      }
    });
  } catch (e) {
    console.error("mail error", e);
    return false;
  }
};
