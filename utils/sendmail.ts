export const sendMail = async ({
  recipient,
  bcc,
  company,
  establishment,
  subject,
  html,
  attachments,
}: {
  recipient: string;
  bcc?: string;
  company: any;
  establishment: any;
  subject: string;
  html: string;
  attachments?: any;
}) => {
  try {
    const nodemailer = require("nodemailer");

    let transporter = nodemailer.createTransport({
      host: company.emailHost,
      port: company.emailPort,
      secure: false,
      auth: {
        user: company.emailUser,
        pass: company.emailPassword,
      },
    });

    let mailOptionsClient = {
      from: `"${company.emailUser}" <${company.emailUser}>`,
      to: recipient,
      bcc: bcc,
      attachments: attachments,
      subject: subject,
      html: templatedMail({
        content: html,
        img64: establishment.logo!.url,
      }),
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

function templatedMail({ content, img64 }: { content: string; img64: string }) {
  return mailPart1({ img64 }) + content + mailPart2;
}

const mailPart1 = ({ img64 }: { img64: string }) => {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html>
  <head>
    <!-- Compiled with Bootstrap Email version: 1.5.1 -->
    <meta http-equiv="x-ua-compatible" content="ie=edge" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <style type="text/css">
      body,
      table,
      td {
        font-family: Helvetica, Arial, sans-serif !important;
      }
      .ExternalClass {
        width: 100%;
      }
      .ExternalClass,
      .ExternalClass p,
      .ExternalClass span,
      .ExternalClass font,
      .ExternalClass td,
      .ExternalClass div {
        line-height: 150%;
      }
      a {
        text-decoration: none;
      }
      * {
        color: inherit;
      }
      a[x-apple-data-detectors],
      u + #body a,
      #MessageViewBody a {
        color: inherit;
        text-decoration: none;
        font-size: inherit;
        font-family: inherit;
        font-weight: inherit;
        line-height: inherit;
      }
      img {
        -ms-interpolation-mode: bicubic;
      }
      table:not([class^="s-"]) {
        font-family: Helvetica, Arial, sans-serif;
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
        border-spacing: 0px;
        border-collapse: collapse;
      }
      table:not([class^="s-"]) td {
        border-spacing: 0px;
        border-collapse: collapse;
      }
      @media screen and (max-width: 600px) {
        .w-full,
        .w-full > tbody > tr > td {
          width: 100% !important;
        }
        .w-8,
        .w-8 > tbody > tr > td {
          width: 32px !important;
        }
        .h-16,
        .h-16 > tbody > tr > td {
          height: 64px !important;
        }
        .p-lg-10:not(table),
        .p-lg-10:not(.btn) > tbody > tr > td,
        .p-lg-10.btn td a {
          padding: 0 !important;
        }
        .pr-4:not(table),
        .pr-4:not(.btn) > tbody > tr > td,
        .pr-4.btn td a,
        .px-4:not(table),
        .px-4:not(.btn) > tbody > tr > td,
        .px-4.btn td a {
          padding-right: 16px !important;
        }
        .pl-4:not(table),
        .pl-4:not(.btn) > tbody > tr > td,
        .pl-4.btn td a,
        .px-4:not(table),
        .px-4:not(.btn) > tbody > tr > td,
        .px-4.btn td a {
          padding-left: 16px !important;
        }
        .pb-6:not(table),
        .pb-6:not(.btn) > tbody > tr > td,
        .pb-6.btn td a,
        .py-6:not(table),
        .py-6:not(.btn) > tbody > tr > td,
        .py-6.btn td a {
          padding-bottom: 24px !important;
        }
        .pt-8:not(table),
        .pt-8:not(.btn) > tbody > tr > td,
        .pt-8.btn td a,
        .py-8:not(table),
        .py-8:not(.btn) > tbody > tr > td,
        .py-8.btn td a {
          padding-top: 32px !important;
        }
        .pb-8:not(table),
        .pb-8:not(.btn) > tbody > tr > td,
        .pb-8.btn td a,
        .py-8:not(table),
        .py-8:not(.btn) > tbody > tr > td,
        .py-8.btn td a {
          padding-bottom: 32px !important;
        }
        *[class*="s-lg-"] > tbody > tr > td {
          font-size: 0 !important;
          line-height: 0 !important;
          height: 0 !important;
        }
        .s-6 > tbody > tr > td {
          font-size: 24px !important;
          line-height: 24px !important;
          height: 24px !important;
        }
      }
    </style>
  </head>
  <body
    class="bg-blue-100"
    style="
      outline: 0;
      width: 100%;
      min-width: 100%;
      height: 100%;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: Helvetica, Arial, sans-serif;
      line-height: 24px;
      font-weight: normal;
      font-size: 16px;
      -moz-box-sizing: border-box;
      -webkit-box-sizing: border-box;
      box-sizing: border-box;
      color: #000000;
      margin: 0;
      padding: 0;
      border-width: 0;
    "
    bgcolor="#cfe2ff"
  >
    <table
      class="bg-blue-100 body"
      valign="top"
      role="presentation"
      border="0"
      cellpadding="0"
      cellspacing="0"
      style="
        outline: 0;
        width: 100%;
        min-width: 100%;
        height: 100%;
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
        font-family: Helvetica, Arial, sans-serif;
        line-height: 24px;
        font-weight: normal;
        font-size: 16px;
        -moz-box-sizing: border-box;
        -webkit-box-sizing: border-box;
        box-sizing: border-box;
        color: #000000;
        margin: 0;
        padding: 0;
        border-width: 0;
      "
      bgcolor="#cfe2ff"
    >
      <tbody>
        <tr>
          <td valign="top" style="line-height: 24px; font-size: 16px; margin: 0" align="left" bgcolor="#cfe2ff">
            <table class="container" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%">
              <tbody>
                <tr>
                  <td align="center" style="line-height: 24px; font-size: 16px; margin: 0; padding: 0 16px">
                    <!--[if (gte mso 9)|(IE)]>
                                          <table align="center" role="presentation">
                                            <tbody>
                                              <tr>
                                                <td width="600">
                                        <![endif]-->
                    <table align="center" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px; margin: 0 auto">
                      <tbody>
                        <tr>
                          <td style="line-height: 24px; font-size: 16px; margin: 0" align="left">
                            <table class="s-6 w-full" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%" width="100%">
                              <tbody>
                                <tr>
                                  <td style="line-height: 24px; font-size: 24px; width: 100%; height: 24px; margin: 0" align="left" width="100%" height="24">
                                    &#160;
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                            <table class="ax-center" role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto">
                              <tbody>
                                <tr>
                                  <td style="line-height: 24px; font-size: 16px; margin: 0" align="left">
                                    <img
                                      class="h-16"
                                      src="${img64}"
                                      style="
                                        height: 64px;
                                        line-height: 100%;
                                        outline: none;
                                        text-decoration: none;
                                        display: block;
                                        border-style: none;
                                        border-width: 0;
                                      "
                                      height="64"
                                    />
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                            <table class="s-6 w-full" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%" width="100%">
                              <tbody>
                                <tr>
                                  <td style="line-height: 24px; font-size: 24px; width: 100%; height: 24px; margin: 0" align="left" width="100%" height="24">
                                    &#160;
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                            <table
                              class="card rounded-3xl px-4 py-8 p-lg-10"
                              role="presentation"
                              border="0"
                              cellpadding="0"
                              cellspacing="0"
                              style="border-radius: 24px; border-collapse: separate !important; width: 100%; overflow: hidden; border: 1px solid #e2e8f0"
                              bgcolor="#ffffff"
                            >
                              <tbody>
                                <tr>
                                  <td
                                    style="line-height: 24px; font-size: 16px; width: 100%; border-radius: 24px; margin: 0; padding: 40px"
                                    align="left"
                                    bgcolor="#ffffff"
                                  >`;
};
const mailPart2 = `</td>
                                </tr>
                              </tbody>
                            </table>
                            <table class="s-6 w-full" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%" width="100%">
                              <tbody>
                                <tr>
                                  <td style="line-height: 24px; font-size: 24px; width: 100%; height: 24px; margin: 0" align="left" width="100%" height="24">
                                    &#160;
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <!--[if (gte mso 9)|(IE)]>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                        <![endif]-->
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`;
