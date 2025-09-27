import nodemailer from "nodemailer";
import * as emailTemplates from "./emailTemplate.js";
import { logger } from "../app.js";

const appEmails = {
  sendOTP: "verify@rkgarbanight.com",
  sendTicket: "booking@rkgarbanight.com",
  info: "info@rkgarbanight.com",
  support: "support@rkgarbanight.com",
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
  employeeRegistration: {
    from: appEmails.info,
    subject: "Employee Registration Successful",
    template: ({ employee, admin, password }) =>
      emailTemplates.employeeRegistrationEmail({
        employee,
        admin,
        password,
      }),
  },
  employeeCredentialsUpdate: {
    from: appEmails.info,
    subject: "Employee Credentials Updated",
    template: ({ employee, admin, updatedFields, password }) =>
      emailTemplates.employeeCredentialsUpdateEmail({
        employee,
        updatedFields,
        admin,
        password,
      }),
  },
  eventRegistration: {
    from: appEmails.info,
    subject: "Event Registration Successful",
    template: ({ event, admin }) =>
      emailTemplates.eventRegistrationEmail({
        event,
        admin,
      }),
  },
  issuedPass: {
    from: appEmails.sendTicket,
    subject: "Your Event Pass Details",
    template: ({
      attendee,
      qrCid,
      qrImage,
      passCategory,
      orderNumber,
      subeventName,
      expiryDate,
    }) =>
      emailTemplates.issuedPassEmail({
        attendee,
        qrCid,
        qrImage,
        passCategory,
        orderNumber,
        subeventName,
        expiryDate,
        title: "Your Event Pass",
      }),
  },
  issuedPassBulk: {
    from: appEmails.sendTicket,
    subject: ({ orderId = "" }) => `Passes for Order ${orderId}`,
    template: ({ orderId, billingUserName, passes }) =>
      emailTemplates.issuedBulkPassEmail({
        orderId,
        billingUserName,
        passes,
        title: "Your Event Passes",
      }),
  },
  issuedPassMultiDay: {
    from: appEmails.sendTicket,
    subject: "Your Multi-Day Event Passes",
    template: ({
      attendee,
      passes,
      passCategory,
      orderNumber,
      billingUserName,
    }) =>
      emailTemplates.issuedPassMultiDayEmail({
        attendee,
        passes, // array with day, subeventName, expiryDate, qrImage
        passCategory,
        orderNumber,
        billingUserName,
        title: "Your Multi-Day Event Passes",
      }),
  },
};

const dataUrlToAttachment = (dataUrl, filename = "qr.png", cid = null) => {
  const match = /^data:(.+);base64,(.+)$/.exec(dataUrl || "");
  if (!match) {
    throw new Error("Invalid data URL");
  }
  const mime = match[1]; // e.g. image/png
  const base64 = match[2];
  const content = Buffer.from(base64, "base64");
  return {
    filename,
    content,
    contentType: mime,
    cid: cid || `${filename.replace(/\W/g, "_")}@example.com`, // unique content-id
  };
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || "false") === "true", // true for 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === "production",
  },
});

transporter.verify((err, success) => {
  if (err) console.error("SMTP verify failed:", err);
  else console.log("SMTP verified.");
});

const sendMail = async (
  to,
  type = "sendVerificationOTP",
  templateData = {},
  attachments = []
) => {
  const emailConfig = emailTypeMap[type];

  if (!emailConfig) {
    throw new Error(`Unsupported email type: ${type}`);
  }

  const html =
    typeof emailConfig.template === "function"
      ? await emailConfig.template(templateData)
      : emailConfig.template;

  const subject =
    typeof emailConfig.subject === "function"
      ? emailConfig.subject(templateData)
      : emailConfig.subject;
  try {
    const info = await transporter.sendMail({
      from: emailConfig.from || process.env.SMTP_USER,
      to: Array.isArray(to) ? to.join(",") : to,
      subject,
      html,
      attachments,
    });

    logger.info("Message sent: %s", info.messageId);
    return { emailData: info, error: null };
  } catch (error) {
    logger.error("Error sending email:", error);
    return { emailData: null, error };
  }
};

export { sendMail, dataUrlToAttachment };
