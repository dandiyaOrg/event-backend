import { Resend } from "resend";
import * as emailTemplates from "./emailTemplate.js";

const appEmails = {
  sendOTP: "verify@rksahyog.com",
  sendTicket: "booking@rksahyog.com",
  info: "info@rksahyog.com",
  support: "support@rksahyog.com",
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

  const { data, error } = await resend.emails.send({
    from: emailConfig.from,
    to: Array.isArray(to) ? to : [to],
    subject: emailConfig.subject,
    html,
  });
  if (error) {
    console.error("Error sending email:", error);
  }
  return { emailData: data, error };
};

export default sendMail;
