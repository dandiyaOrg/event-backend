import nodemailer from "nodemailer";
import * as emailTemplates from "./emailTemplate.js";

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
      qrImage,
      passCategory,
      orderNumber,
      subeventName,
      expiryDate,
    }) =>
      emailTemplates.issuedPassEmail({
        attendee,
        qrImage,
        passCategory,
        orderNumber,
        subeventName,
        expiryDate,
        title: "Your Event Pass",
      }),
  },
  issuedPassMultiDay: {
    from: appEmails.sendTicket,
    subject: "Your Multi-Day Event Passes",
    template: ({ attendee, passes, passCategory, orderNumber }) =>
      emailTemplates.issuedPassMultiDayEmail({
        attendee,
        passes, // array with day, subeventName, expiryDate, qrImage
        passCategory,
        orderNumber,
        title: "Your Multi-Day Event Passes",
      }),
  },
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendMail = async (
  to,
  type = "sendVerificationOTP",
  templateData = {}
) => {
  const emailConfig = emailTypeMap[type];

  if (!emailConfig) {
    throw new Error(`Unsupported email type: ${type}`);
  }

  const html =
    typeof emailConfig.template === "function"
      ? await emailConfig.template(templateData)
      : emailConfig.template;

  try {
    const info = await transporter.sendMail({
      from: emailConfig.from || process.env.SMTP_USER,
      to: Array.isArray(to) ? to.join(",") : to,
      subject: emailConfig.subject,
      html,
    });

    console.log("Message sent: %s", info.messageId);
    return { emailData: info, error: null };
  } catch (error) {
    console.error("Error sending email:", error);
    return { emailData: null, error };
  }
};

export default sendMail;
