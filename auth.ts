import { statelessSessions } from "@keystone-6/core/session";
import { sendMail } from "./lib/mail/sendmail";
import { createAuth } from "@keystone-6/auth";
import { randomBytes } from "crypto";
import { sendSystemEmail } from "./lib/mail/sendsystememail";
import { t } from "./lib/localization/localization";
import { passwordResetTemplate } from "./lib/mail/templates/password-reset/universal";
import { reverseTransformEmail, transformEmail } from "./lib/utils";

let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && process.env.NODE_ENV !== "production") {
  sessionSecret = randomBytes(32).toString("hex");
}

const { withAuth } = createAuth({
  listKey: "User",
  identityField: "email",
  sessionData: "id role permissions isBlocked company { id accountancy { id } } accountancy { id }",
  secretField: "password",
  initFirstItem: {
    fields: ["name", "role", "email", "password"],
  },
  passwordResetLink: {
    sendToken: async ({ itemId, identity, token, context }) => {
      const recipient = await context.sudo().query.User.findOne({
        where: { id: itemId as string },
        query: "id preferredLanguage",
      });
      const email = reverseTransformEmail(identity);
      const preferredLanguage = recipient.preferredLanguage ?? "en";
      sendSystemEmail({
        recipient: email,
        subject: t("password-reset-request", preferredLanguage),
        html: passwordResetTemplate({
          resetToken: token,
          preferredLanguage: preferredLanguage,
          email: identity,
        }),
      });
    },
    tokensValidForMins: 60,
  },
});

const sessionMaxAge = 60 * 60 * 24 * 30;

const session = statelessSessions({
  maxAge: sessionMaxAge,
  secret: sessionSecret!,
});

export { withAuth, session };
