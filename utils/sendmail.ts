export const sendMail = async ({ transport, attachment }: { transport: any; attachment: any }) => {
  try {
    let mailOptionsClient = {
      from: `"backupsercemdimuhsaebe@huseyinonal.com" <backupsercemdimuhsaebe@huseyinonal.com>`,
      to: ["sercebackupmdimuhasebe@hotmail.com", "backupsercemdimuhsaebe@huseyinonal.com"],
      attachments: attachment,
      subject: "Serce MDI Muhasebe veri tabanı yedeği",
      text: `Serce MDI Muhasebe veri tabanı yedeği ${new Date().toLocaleString("tr-TR")}`,
    };

    transport.sendMail(mailOptionsClient, (error, info) => {
      if (error) {
        console.error(error);
        return false;
      } else {
        console.log("Email sent: " + info.response);
        return true;
      }
    });
  } catch (e) {
    console.error(e);
    return false;
  }
};
