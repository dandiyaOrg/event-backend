const emailVerfication = ({
  title = "Verify your email",
  name = "",
  link = "",
  time = new Date(),
  emailToken,
}) => {
  return `
    <div>

        <head data-id="__react-email-head">
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
            <title>${title}</title>
        </head>
        <div id="__react-email-preview" style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">Idurar erp demo verification<div> ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿</div>
        </div>

        <body data-id="__react-email-body">
            <h2 data-id="react-email-heading">${title}</h2>
            <hr data-id="react-email-hr" style="width:100%;border:none;border-top:1px solid #eaeaea" />
            <p data-id="react-email-text" style="font-size:16px;line-height:24px;margin:16px 0">Hello ${name},</p>
            <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0">Code : <br>${emailToken}</br> </p>
            <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0">Thank you for signing up for IDURAR ! Before we can activate your account, we kindly ask you to verify your email address by clicking on the link provided below:</p>
            <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0"><a href="${link}">${link}</a></p>
            <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0">Thank you for choosing IDURAR. We look forward to having you as a valued user!</p>
            <hr data-id="react-email-hr" style="width:100%;border:none;border-top:1px solid #eaeaea" />
            <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0">Best regards,</p>
            <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0">Salah Eddine Lalami</p>
            <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0">Founder @ IDURAR</p>
        </body>
    </div>
    `;
};

const passwordVerfication = ({
  title = "Reset your Password",
  name = "",
  link = "",
  time = new Date(),
}) => {
  return `
    <div>

        <head data-id="__react-email-head">
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
            <title>${title}</title>
        </head>
        <div id="__react-email-preview" style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">Reset your Password<div> ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿</div>
        </div>

        <body data-id="__react-email-body">
            <h2 data-id="react-email-heading">${title}</h2>
            <hr data-id="react-email-hr" style="width:100%;border:none;border-top:1px solid #eaeaea" />
            <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0">Hello ${name},</p>
            <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0">We have received a request to reset the password for your account on IDURAR. To proceed with the password reset, please click on the link provided below:</p>
            <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0"><a href="${link}">${link}</a></p>
            <hr data-id="react-email-hr" style="width:100%;border:none;border-top:1px solid #eaeaea" />
            <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0">Best regards,</p>
            <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0">Salah Eddine Lalami</p>
            <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0">Founder @ IDURAR</p>
        </body>
    </div>
    `;
};

const afterRegistrationSuccess = ({
  title = "Customize IDURAR ERP CRM or build your own SaaS",
  name = "",
}) => {
  return `
    <div>

        <head data-id="__react-email-head">
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
            <title>${title}</title>
        </head>
        <div id="__react-email-preview" style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">Customize IDURAR or build your own Saas<div> ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿</div>
        </div>

        <body data-id="__react-email-body">
            <h2 data-id="react-email-heading">${title}</h2>
            <hr data-id="react-email-hr" style="width:100%;border:none;border-top:1px solid #eaeaea" />
            <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0">Hello ${name},</p>
            <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0">I would like to invite you to book a call if you need : </p>
            <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0"> * Customize or adding new features to IDURAR ERP CRM.</p>
            <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0"> * Build your own custom SaaS solution based on IDURAR ERP CRM , With IDURAR SaaS license  ,  instead of investing  in an uncertain developer team. This opportunity allows you to build a tailored SaaS platform that meets your specific business needs.</p>
            <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0"> Book a call here  <a href="https://calendly.com/lalami/meeting">https://calendly.com/lalami/meeting</a></p>
            <hr data-id="react-email-hr" style="width:100%;border:none;border-top:1px solid #eaeaea" />
            <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0">Best regards,</p>
            <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0">Salah Eddine Lalami</p>
            <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0">Founder @ IDURAR</p>
        </body>
    </div>
    
    `;
};

const adminOtpLoginEmail = ({
  admin = {},
  otp = "",
  title = "Admin Login Verification",
  time = new Date(),
}) => {
  return `
  <div style="background:#f8f9fa;font-family:'Segoe UI',Arial,sans-serif;padding:40px;">
    <div style="max-width:400px;margin:0 auto;background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.06);padding:32px 28px;">
      <div style="text-align:center;">
        <img src="https://cdn-icons-png.flaticon.com/512/3105/3105857.png" alt="Admin Login" style="width:58px;height:58px;margin-bottom:14px;" />
        <h2 style="font-size:22px;font-weight:700;margin:0 0 10px 0;color:#212529;">${title}</h2>
        <p style="color:#6c757d;font-size:14px;">${time.toLocaleString()}</p>
      </div>
      <hr style="margin:18px 0 18px 0;border:none;border-top:1px solid #e7e7e7;" />
      <p style="font-size:15px;margin:16px 0 8px 0;line-height:1.5;">Hello <b>${admin.name || ""}</b>,</p>
      <p style="font-size:15px;color:#43484d;line-height:1.5;margin-bottom:18px;">
        Please use the following One Time Password (OTP) to complete your admin login:
      </p>
      <div style="text-align:center;margin:30px 0;">
        <div style="display:inline-block;background:#f1f3f7;border-radius:8px;padding:15px 32px;">
          <span style="font-size:28px;letter-spacing:8px;font-weight:600;color:#007bff;">${otp}</span>
        </div>
      </div>
      <p style="font-size:13px;color:#747a80;line-height:1.6;margin:27px 0 7px 0;">
        This OTP is valid for 5 minutes.<br>
        If you did not request this login, please contact your system administrator immediately.
      </p>
      <hr style="margin:16px 0;border-top:1px solid #ececec;" />
      <div style="font-size:13px;color:#444;margin-top:13px;">
        <b>${admin.name || "Admin"}</b><br>
        ${admin.organization ? admin.organization + "<br>" : ""}
        ${admin.email ? `Email: <a href="mailto:${admin.email}" style="color:#2065d1;">${admin.email}</a><br>` : ""}
        ${admin.mobile_no ? `Mobile: <a href="tel:${admin.mobile_no}" style="color:#2065d1;">${admin.mobile_no}</a><br>` : ""}
      </div>
      <div style="color:#bbbbbb;font-size:11px;text-align:center;margin-top:26px;">
        © ${new Date().getFullYear()} ${admin.organization || ""}
      </div>
    </div>
  </div>
  `;
};

const employeeRegistrationEmail = ({
  employee = {},
  admin = {},
  password = "",
  title = "Welcome to the Team!",
  time = new Date(),
}) => {
  return `
  <div style="background:#f8f9fa;font-family:'Segoe UI',Arial,sans-serif;padding:40px;">
    <div style="max-width:430px;margin:0 auto;background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.06);padding:32px 28px;">
      <div style="text-align:center;">
        <img src="https://cdn-icons-png.flaticon.com/512/2206/2206368.png"
             alt="Employee Registered" style="width:60px;height:60px;margin-bottom:14px;" />
        <h2 style="font-size:22px;font-weight:700;margin:0 0 10px;color:#212529;">
          ${title}
        </h2>
        <p style="color:#6c757d;font-size:14px;">${time.toLocaleString()}</p>
      </div>
      <hr style="margin:18px 0;border:none;border-top:1px solid #e7e7e7;" />
      <p style="font-size:15px;margin:12px 0 8px;line-height:1.6;">
        Dear <b>${employee.name || "Employee"}</b>,
      </p>
      <p style="font-size:15px;color:#43484d;line-height:1.5;margin-bottom:20px;">
        Your registration as an employee has been successfully completed!
      </p>
      <div style="background:#f4f7fa;border-radius:8px;padding:18px 24px;margin:16px 0;">
        <h3 style="font-size:15px;margin:0 0 10px 0;color:#007bff;">Your Details:</h3>
        <ul style="list-style:none;margin:0;padding:0;font-size:14px;">
          <li><b>Name:</b> ${employee.name || "-"}</li>
          <li><b>Email:</b> ${employee.email || "-"}</li>
          <li><b>Username:</b> ${employee.username || "-"}</li>
          <li><b>Password:</b> ${password || "(as set during registration)"}</li>
        </ul>
      </div>
      <p style="font-size:13px;color:#6c757d;margin:18px 0 0 0;line-height:1.5;">
        Please keep your login credentials safe. If you face any issues logging in, contact your administrator.
      </p>
      <hr style="margin:16px 0 10px 0;border-top:1px solid #ececec;" />
      <div style="font-size:13px;color:#444;margin-top:10px;">
        Registered by: <b>${admin.name || "Admin"}</b><br>
        ${admin.organization ? "Organization: " + admin.organization + "<br>" : ""}
        ${admin.email ? `Admin Email: <a href="mailto:${admin.email}" style="color:#2065d1;">${admin.email}</a><br>` : ""}
      </div>
      <div style="color:#bbbbbb;font-size:11px;text-align:center;margin-top:26px;">
        © ${new Date().getFullYear()} ${admin.organization || ""}
      </div>
    </div>
  </div>
  `;
};

const employeeCredentialsUpdateEmail = ({
  employee = {},
  updatedFields = [],
  admin = {},
  password = "",
  title = "Employee Credentials Updated",
  time = new Date(),
}) => {
  const details = [];
  if (updatedFields.includes("email")) {
    details.push(`<li><b>Email:</b> ${employee.email || "-"}</li>`);
  }
  if (updatedFields.includes("username")) {
    details.push(`<li><b>Username:</b> ${employee.username || "-"}</li>`);
  }
  if (updatedFields.includes("password")) {
    details.push(`<li><b>Password:</b> ${password || "-"}</li>`);
  }

  return `
  <div style="background:#f8f9fa;font-family:'Segoe UI',Arial,sans-serif;padding:40px;">
    <div style="max-width:410px;margin:0 auto;background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.06);padding:30px 24px;">
      <div style="text-align:center;">
        <img src="https://cdn-icons-png.flaticon.com/512/3652/3652191.png" alt="Update" style="width:44px;height:44px;margin-bottom:13px;" />
        <h2 style="font-size:20px;font-weight:700;margin:0 0 10px 0;color:#212529;">
          ${title}
        </h2>
        <p style="color:#6c757d;font-size:13px;">${time.toLocaleString()}</p>
      </div>
      <hr style="margin:16px 0;border-top:1px solid #e7e7e7;" />
      <p style="font-size:15px;margin:10px 0 15px 0;line-height:1.6;">
        Dear <b>${employee.name || "Employee"}</b>,<br>
        The following account credentials have been updated:
      </p>
      <ul style="list-style:none;padding:0;margin:0 0 10px 0;font-size:14px;">
        ${details.join("")}
      </ul>
      <hr style="margin:14px 0;border-top:1px solid #ececec;" />
      <div style="font-size:12.5px;color:#444;margin-top:6px;">
        Updated by: <b>${admin.name || "Admin"}</b><br>
        ${admin.organization ? "Organization: " + admin.organization + "<br>" : ""}
      </div>
      <div style="color:#bbbbbb;font-size:11px;text-align:center;margin-top:18px;">
        © ${new Date().getFullYear()} ${admin.organization || ""}
      </div>
    </div>
  </div>
  `;
};

const eventRegistrationEmail = ({
  admin = {},
  event = {},
  title = "New Event Created Successfully",
  time = new Date(),
}) => {
  return `
  <div style="background:#f8f9fa;font-family:'Segoe UI',Arial,sans-serif;padding:40px;">
    <div style="max-width:510px;margin:0 auto;background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.06);padding:30px 24px;">
      <div style="text-align:center;">
        <img src="${event.event_image || "https://cdn-icons-png.flaticon.com/512/1670/1670347.png"}" alt="Event Image" style="width:60px;height:60px;margin-bottom:16px;border-radius:8px;object-fit:cover;" />
        <h2 style="font-size:22px;font-weight:700;margin:0 0 12px 0;color:#212529;">
          ${title}
        </h2>
        <p style="color:#6c757d;font-size:13px;margin:0 0 18px 0;">${time.toLocaleString()}</p>
      </div>
      <hr style="margin:16px 0;border-top:1px solid #e7e7e7;" />
      <p style="font-size:15px;line-height:1.6;margin-bottom:15px;">
        Dear <b>${admin.name || "Admin"}</b>,<br />
        A new event has been created with the following details:
      </p>
      <ul style="list-style:none;padding:0;margin:0 0 15px 0;font-size:14px;color:#212529;">
        <li><b>Event Name:</b> ${event.event_name || "-"}</li>
        <li><b>Event Number:</b> ${event.event_number || "-"}</li>
        <li><b>Type of Event:</b> ${event.type_of_event || "-"}</li>
        <li><b>Status:</b> ${event.status || "-"}</li>
        <li><b>Venue:</b> ${event.venue || "-"}</li>
        <li><b>Start Date:</b> ${event.date_start || "-"}</li>
        <li><b>End Date:</b> ${event.date_end || "-"}</li>
        <li><b>Number of Days:</b> ${event.number_of_days || "-"}</li>
        <li><b>Google Map Link:</b> <a href="${event.google_map_link || "#"}" target="_blank">View Map</a></li>
        ${event.description ? `<li><b>Description:</b> ${event.description}</li>` : ""}
        ${event.event_url ? `<li><b>Event URL:</b> <a href="${event.event_url}" target="_blank">${event.event_url}</a></li>` : ""}
        ${event.event_qr ? `<li><b>QR Code:</b> <img src="${event.event_qr}" alt="QR Code" style="height:60px;vertical-align:middle;" /></li>` : ""}
      </ul>
      <hr style="margin:14px 0;border-top:1px solid #ececec;" />
      <div style="font-size:12.5px;color:#444;margin-top:8px;">
        Created by: <b>${admin.name || "Admin"}</b><br/>
        ${admin.organization ? "Organization: " + admin.organization : ""}
      </div>
      <div style="color:#bbbbbb;font-size:11px;text-align:center;margin-top:20px;">
        © ${new Date().getFullYear()} ${admin.organization || ""}
      </div>
    </div>
  </div>
  `;
};

const issuedPassEmail = ({
  attendee = {},
  qrImage = "",
  qrCid,
  passCategory = "",
  orderNumber = "",
  subeventName = "",
  expiryDate = null,
  title = "Your Event Pass",
}) => {
  const expiryText = expiryDate
    ? `<p style="font-size:14px; color:#dc3545; font-weight:bold;">
         Note: Your pass expires on ${expiryDate}.
       </p>`
    : "";

  return `
  <div style="background:#f8f9fa;font-family:'Segoe UI',Arial,sans-serif;padding:40px;">
    <div style="max-width:420px;margin:0 auto;background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.06);padding:32px 28px;">
      <div style="text-align:center; margin-bottom: 24px;">
        <img src="https://cdn-icons-png.flaticon.com/512/190/190411.png" alt="Event Pass" style="width:60px;height:60px;margin-bottom:14px;" />
        <h2 style="font-size:22px;font-weight:700;margin:0;color:#212529;">${title}</h2>
        <p style="color:#6c757d;font-size:14px;">Order #: ${orderNumber}</p>
      </div>
      <p style="font-size:15px;margin:16px 0 8px 0;line-height:1.5;">
        Hello <b>${attendee.name || "Attendee"}</b>,
      </p>
      <p style="font-size:15px;color:#43484d;line-height:1.5;margin-bottom:18px;">
        Thank you for booking. Please find your pass details below:
      </p>
      <ul style="font-size:15px; color:#212529; padding-left:20px; margin-bottom:20px;">
        <li><b>Pass Category:</b> ${passCategory}</li>
        <li><b>Subevent:</b> ${subeventName}</li>
        ${expiryText}
      </ul>
      <div style="text-align:center;margin:30px 0;">
        <img src="cid:${qrCid}" alt="QR Code" style="width:200px; height:200px; border:1px solid #ddd; border-radius:8px;" />
      </div>
      <p style="font-size:13px;color:#747a80;line-height:1.6;margin:20px 0 0 0;">
        Please present this QR code at the event check-in.
      </p>
      <hr style="margin:16px 0;border-top:1px solid #ececec;" />
      <div style="font-size:13px;color:#444;margin-top:13px; text-align:center;">
        Thank you for being with us!<br/>
        &copy; ${new Date().getFullYear()}
      </div>
    </div>
  </div>
  `;
};

const issuedBulkPassEmail = ({
  orderId = "",
  billingUserName = "",
  passes = [], // array of { attendee_name, qrCid, qrImage, passCategory, subeventName, expiryDate }
  title = "Your Event Passes",
}) => {
  const year = new Date().getFullYear();

  const rows =
    passes && passes.length
      ? passes
          .map((p) => {
            const expiryText = p.expiryDate
              ? `<div style="font-size:13px;color:#dc3545;font-weight:600;margin-top:6px;">
                   Expires: ${p.expiryDate}
                 </div>`
              : "";

            // Prefer CID (attachment) if present, else fallback to qrImage URL (may be blocked in some clients)
            const qrHtml = p.qrCid
              ? `<img src="cid:${p.qrCid}" alt="QR for ${p.attendee_name || "Attendee"}" style="width:100px;height:100px;object-fit:cover;border:1px solid #ddd;border-radius:6px;" />`
              : p.qrImage
                ? `<img src="${p.qrImage}" alt="QR for ${p.attendee_name || "Attendee"}" style="width:100px;height:100px;object-fit:cover;border:1px solid #ddd;border-radius:6px;" />`
                : `<div style="width:100px;height:100px;display:inline-block;border:1px dashed #ccc;border-radius:6px;line-height:100px;text-align:center;color:#999;font-size:12px;">No QR</div>`;

            return `
            <tr style="border-bottom:1px solid #eee;">
              <td style="padding:14px 12px; vertical-align:top;">
                <div style="font-size:15px;color:#212529;font-weight:700;margin-bottom:6px;">${p.attendee_name || "Attendee"}</div>
                <div style="font-size:14px;color:#43484d;margin-bottom:4px;"><strong>Pass:</strong> ${p.passCategory || "-"}</div>
                <div style="font-size:14px;color:#43484d;margin-bottom:4px;"><strong>Event / Subevent:</strong> ${p.subeventName || "-"}</div>
                ${expiryText}
              </td>
              <td style="width:120px;padding:12px;text-align:center;vertical-align:middle;">
                ${qrHtml}
              </td>
            </tr>
          `;
          })
          .join("")
      : `<tr><td style="padding:16px;text-align:center;color:#666;">No passes found for this order.</td></tr>`;

  return `
  <div style="background:#f8f9fa;font-family:'Segoe UI',Arial,sans-serif;padding:36px;">
    <div style="max-width:700px;margin:0 auto;background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.06);padding:28px;">
      <div style="text-align:center; margin-bottom:18px;">
        <img src="https://cdn-icons-png.flaticon.com/512/190/190411.png" alt="Event Passes" style="width:56px;height:56px;margin-bottom:10px;" />
        <h2 style="font-size:20px;font-weight:700;margin:6px 0;color:#212529;">${title}</h2>
        <p style="color:#6c757d;font-size:13px;margin:0;">Order #: ${orderId}</p>
        ${billingUserName ? `<p style="color:#6c757d;font-size:13px;margin:4px 0 0 0;">To: ${billingUserName}</p>` : ""}
      </div>

      <p style="font-size:15px;color:#43484d;line-height:1.5;margin:8px 0 18px 0;">
        Hello ${billingUserName || "Billing User"},<br/>
        Please find all the passes associated with your order listed below. You can share these with the attendees as needed.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tbody>
          ${rows}
        </tbody>
      </table>

      <hr style="margin:18px 0;border-top:1px solid #ececec;" />

      <div style="font-size:13px;color:#747a80;line-height:1.6;text-align:center;">
        If you need help, reply to this email.<br/>
        &copy; ${year} Your Organization Name
      </div>
    </div>
  </div>
  `;
};
const issuedPassMultiDayEmail = ({
  attendee = {},
  passes = [], // Array of { day, subeventName, expiryDate, qrCid?, qrImage?, issued_pass_id? }
  passCategory = "",
  orderNumber = "",
  billingUserName = "", // NEW: billing user name shown in header
  title = "Your Multi-Day Event Passes",
}) => {
  // normalize & sort passes by day
  const normalized = (passes || []).slice().sort((a, b) => {
    const da = typeof a.day === "number" ? a.day : Infinity;
    const db = typeof b.day === "number" ? b.day : Infinity;
    return da - db;
  });

  const rowsHtml =
    normalized.length > 0
      ? normalized
          .map((p) => {
            // expiry formatting
            let expiryDisplay = "";
            if (p.expiryDate) {
              try {
                const d = new Date(p.expiryDate);
                expiryDisplay = isNaN(d.getTime())
                  ? String(p.expiryDate)
                  : d.toLocaleDateString();
              } catch {
                expiryDisplay = String(p.expiryDate);
              }
            }

            // qr image html: prefer CID (attachment), fallback to qrImage (data URL or public url) else placeholder
            const qrHtml = p.qrCid
              ? `<img src="cid:${p.qrCid}" alt="QR Day ${p.day}" style="width:180px;height:180px;border:1px solid #eee;border-radius:8px;object-fit:cover;" />`
              : p.qrImage
                ? `<img src="${p.qrImage}" alt="QR Day ${p.day}" style="width:180px;height:180px;border:1px solid #eee;border-radius:8px;object-fit:cover;" />`
                : `<div style="width:180px;height:180px;display:inline-block;border:1px dashed #ccc;border-radius:8px;line-height:180px;text-align:center;color:#999;font-size:13px;">No QR</div>`;

            return `
              <tr>
                <td style="padding:18px 0;border-bottom:1px solid #f2f2f2;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
                    <tr>
                      <td style="vertical-align:top;padding-right:14px;">
                        <div style="font-size:16px;color:#212529;font-weight:700;margin-bottom:6px;">Day ${p.day || "-"}</div>
                        <div style="font-size:14px;color:#43484d;margin-bottom:6px;"><strong>Session:</strong> ${p.subeventName || "-"}</div>
                        ${expiryDisplay ? `<div style="font-size:13px;color:#dc3545;font-weight:600;margin-top:6px;">Expires: ${expiryDisplay}</div>` : ""}
                        ${passCategory ? `<div style="font-size:13px;color:#6c757d;margin-top:8px;">Category: ${passCategory}</div>` : ""}
                      </td>
                      <td style="width:200px;text-align:center;vertical-align:middle;">
                        ${qrHtml}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            `;
          })
          .join("\n")
      : `<tr><td style="padding:20px;text-align:center;color:#666;">No passes available.</td></tr>`;

  return `
  <div style="background:#f8f9fa;font-family:'Segoe UI',Arial,sans-serif;padding:40px;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.06);padding:28px;">
      <div style="text-align:center;margin-bottom:18px;">
        <img src="https://cdn-icons-png.flaticon.com/512/190/190411.png" alt="Event Pass" style="width:60px;height:60px;margin-bottom:14px;" />
        <h2 style="font-size:20px;font-weight:700;margin:0;color:#212529;">${title}</h2>
        <p style="color:#6c757d;font-size:13px;margin:6px 0 0 0;">Order #: ${orderNumber}</p>
        ${billingUserName ? `<p style="color:#6c757d;font-size:13px;margin:4px 0 0 0;">To: ${billingUserName}</p>` : ""}
      </div>

      <p style="font-size:15px;margin:14px 0 6px 0;line-height:1.5;">
        Hello <b>${attendee.name || "Attendee"}</b>,
      </p>
      <p style="font-size:14px;color:#43484d;line-height:1.5;margin-bottom:18px;">
        Thank you for your booking. Below are your passes for each day of the event. Please present the QR code at check-in for each day.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <p style="font-size:13px;color:#747a80;line-height:1.6;margin:22px 0 0 0;text-align:center;">
        If you need assistance, reply to this email.<br/>
        &copy; ${new Date().getFullYear()} Your Organization Name
      </p>
    </div>
  </div>
  `;
};
export {
  adminOtpLoginEmail,
  emailVerfication,
  passwordVerfication,
  afterRegistrationSuccess,
  employeeRegistrationEmail,
  employeeCredentialsUpdateEmail,
  eventRegistrationEmail,
  issuedPassEmail,
  issuedBulkPassEmail,
  issuedPassMultiDayEmail,
};
