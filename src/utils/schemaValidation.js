import Joi from "joi";

// common schema
export const commonFields = {
  name: Joi.string().min(2).max(100).required().messages({
    "string.base": "Name must be a text",
    "string.empty": "Name is required",
    "string.min": "Name must be at least {#limit} characters",
    "string.max": "Name cannot exceed {#limit} characters",
    "any.required": "Name is required",
  }),

  mobileNumber: Joi.string()
    .pattern(/^\d{10}$/)
    .required()
    .messages({
      "string.pattern.base": "Mobile number must contain 10 digits",
      "string.empty": "Mobile number is required",
      "any.required": "Mobile number is required",
    }),

  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "string.empty": "Email is required",
    "any.required": "Email is required",
  }),

  address: Joi.string()
    .min(10)
    .max(255)
    .pattern(/^[a-zA-Z0-9\s,.'\-#\n]+$/)
    .required()
    .messages({
      "string.empty": "Address is required",
      "string.min": "Address must be at least {#limit} characters",
      "string.max": "Address cannot exceed {#limit} characters",
      "string.pattern.base": "Address contains invalid characters",
      "any.required": "Address is required",
    }),

  password: Joi.string()
    .min(8)
    .max(255)
    .pattern(
      new RegExp(
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=[\\]{};':\"\\\\|,.<>/?]).+$"
      )
    )
    .required()
    .messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least {#limit} characters",
      "string.max": "Password cannot exceed {#limit} characters",
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      "any.required": "Password is required",
    }),

  organization: Joi.string().max(200).required().messages({
    "string.empty": "Organization is required",
    "string.max": "Organization cannot exceed {#limit} characters",
    "any.required": "Organization is required",
  }),
  otp: Joi.string().length(6).required().messages({
    "string.base": "OTP must be a string",
    "string.length": "OTP must be {#limit} characters long",
    "string.empty": "OTP is required",
    "any.required": "OTP is required",
  }),
  username: Joi.string().min(6).required().messages({
    "string.base": "Username must be a string",
    "string.empty": "Username is required",
    "string.min": "Username must be at least {#limit} characters",
    "any.required": "Username is required",
  }),
};

// admin registration schema
const adminRegisterSchema = Joi.object({
  name: commonFields.name,
  mobileNumber: commonFields.mobileNumber,
  email: commonFields.email,
  address: commonFields.address,
  password: commonFields.password,
  organization: commonFields.organization,
});

const employeeRegisterSchema = Joi.object({
  name: commonFields.name,
  mobile_no: commonFields.mobileNumber,
  email: commonFields.email,
  password: commonFields.password,
  username: commonFields.username,
});

const employeeUpdateSchema = Joi.object({
  name: commonFields.name.optional(),
  mobile_no: commonFields.mobileNumber.optional(),
  email: commonFields.email.optional(),
  password: commonFields.password.optional(),
  username: commonFields.username.optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

const updatePasswordSchema = Joi.object({
  newPassword: commonFields.password,
}).unknown(true); // allow other fields like admin_id

const otpCheckSchema = Joi.object({
  otp: commonFields.otp,
}).unknown(true); // allow other fields like admin_id

export {
  adminRegisterSchema,
  updatePasswordSchema,
  otpCheckSchema,
  employeeRegisterSchema,
  employeeUpdateSchema,
};
