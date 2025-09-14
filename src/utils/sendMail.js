import { Resend } from "resend";
import * as emailTemplates from "./emailTemplate.js";

const appEmails = {
  sendOTP: "verify@rksahyog.com",
  sendTicket: "booking@rksahyog.com",
};

const emailTypeMap = {
  sendVerificationOTP: {
    from: appEmails.sendOTP,
    subject: "Your Admin Login OTP",
    template: ({ admin, otp, title }) =>
      emailTemplates.adminOtpLoginEmail({ admin, otp, title }),
  },
  sendPasswordReset: {
    from: appEmails.sendTicket,
    subject: "Password Reset Instructions",
    template: () => emailTemplates.passwordVerfication(),
  },
  emailVerification: {
    from: appEmails.sendOTP,
    subject: "Verify Your Email",
    template: ({ name, link, emailToken }) =>
      emailTemplates.emailVerfication({ name, link, emailToken }),
  },
};

const sendMail = async (
  to,
  type = "sendVerificationOTP",
  templateData = {}
) => {
  const resend = new Resend(process.env.RESEND_API);
  const emailConfig = emailTypeMap[type];

  if (!emailConfig) {
    throw new Error(`Unsupported email type: ${type}`);
  }

  const html =
    typeof emailConfig.template === "function"
      ? await emailConfig.template(templateData)
      : emailConfig.template;

  const { data } = await resend.emails.send({
    from: emailConfig.from,
    to: Array.isArray(to) ? to : [to],
    subject: emailConfig.subject,
    html,
  });

  return data;
};

export default sendMail;
