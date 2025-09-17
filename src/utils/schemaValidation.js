import Joi from "joi";

const timeFormat = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
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

  // new added
  event_url: Joi.string().uri().min(3).max(200).required().messages({
    "string.empty": "Event URL is required",
    "string.uri": "Event URL must be a valid URL",
    "any.required": "Event URL is required",
  }),

  status: Joi.string() // optimize it 
    .valid("Initiated", "Active", "Ready", "Closed", "Cancelled")
    .required()
    .messages({
      "any.only":
        "Status must be one of Initiated, Active, Ready, Closed, Cancelled",
      "any.required": "Status is required",
    }),
  event_qr: Joi.string().min(3).max(200).required().messages({
    "string.empty": "Event QR is required",
    "string.min": "Event QR must be at least {#limit} characters",
    "string.max": "Event QR cannot exceed {#limit} characters",
    "any.required": "Event QR is required",
  }),
  description: Joi.string().allow(null, "").messages({
    "string.base": "Description must be a string",
  }),
  venue: Joi.string().min(5).max(500).required().messages({
    "string.empty": "Venue is required",
    "string.min": "Venue must be at least {#limit} characters",
    "string.max": "Venue cannot exceed {#limit} characters",
    "any.required": "Venue is required",
  }),

  type_of_event: Joi.string()
    .valid(
      "conference",
      "workshop",
      "seminar",
      "concert",
      "exhibition",
      "sports",
      "festival",
      "other"
    )
    .required()
    .messages({
      "any.only": "Type of event must be one of the allowed values",
      "any.required": "Type of event is required",
    }),
  number_of_days: Joi.number().integer().min(1).max(365).messages({
    "number.base": "Number of days must be a number",
    "number.min": "Number of days must be at least {#limit}",
    "number.max": "Number of days cannot exceed {#limit}",
  }),

  // issue fix thhat 
  date_start: Joi.date().greater("now").required().messages({
    "date.base": "Start date must be a valid date",
    "date.greater": "Start date must be today or in the future",
    "any.required": "Start date is required",
  }),
  date_end: Joi.date().greater(Joi.ref("date_start")).required().messages({ 
    "date.base": "End date must be a valid date",
    "date.greater": "End date must be after start date",
    "any.required": "End date is required",
  }),

  is_active: Joi.boolean().default(true),


  date: Joi.date().greater("now").required().messages({
    "date.base": "Date must be a valid date",
    "date.greater": "Date must be today or in the future",
    "any.required": "Date is required",
  }),

  start_time: Joi.string().pattern(timeFormat).required().messages({
    "string.pattern.base": "Starting time must be in HH:MM:SS format",
    "string.empty": "Starting time is required",
  }),

  // issue end time > start time 
  end_time: Joi.string().pattern(timeFormat).required().messages({
    "string.pattern.base": "Ending time must be in HH:MM:SS format",
    "string.empty": "Ending time is required",
  }),
  day: Joi.number().integer().min(1).max(365).required().messages({
    "number.base": "Day must be a number",
    "number.min": "Day cannot be less than 1",
    "number.max": "Day cannot be more than 365",
    "any.required": "Day is required",
  }),
  quantity: Joi.number()
    .integer()
    .min(1)
    .max(10000)
    .default(1)
    .required()
    .messages({
      "number.base": "Quantity must be a number",
      "number.min": "Quantity cannot be less than 1",
      "number.max": "Quantity cannot exceed 10000",
      "any.required": "Quantity is required",
    }),
  available_quantity: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      "number.base": "Available quantity must be a number",
      "number.min": "Available quantity cannot be less than 0",
      "any.required": "Available quantity is required",
    })
    .custom((value, helpers) => {
    const { quantity } = helpers.state.ancestors[0];
    if (quantity !== undefined && value > quantity) {
      return helpers.error("any.invalid", {
        message: "Available quantity cannot exceed total quantity",
      });
    }
    return value;
  }),
  images: Joi.array()
    .items(
      Joi.string().uri().messages({
        "string.uri": "Each image must be a valid URL",
        "string.base": "Each image must be a string",
      })
    )
    .max(3)
    .messages({
      "array.max": "Maximum 3 images allowed",
      "array.base": "Images must be an array",
    })
    .optional(),

  whatsapp : Joi.string()
  .pattern(/^\d+$/)
  .min(10)
  .max(15)
  .messages({
    "string.pattern.base": "WhatsApp number must contain only numbers",
    "string.min": "WhatsApp number must be at least {#limit} digits",
    "string.max": "WhatsApp number cannot exceed {#limit} digits",
    "string.base": "WhatsApp number must be a string",
  })
  .optional(),
  dob : Joi.date()
  .less('now') // must be in the past
  .custom((value, helpers) => {
    if (value) {
      const today = new Date();
      const birthDate = new Date(value);
      const age = today.getFullYear() - birthDate.getFullYear();

      // Adjust for month/day
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
      }

      if (age < 0 || age > 120) {
        return helpers.error("any.invalid", { message: "Invalid date of birth" });
      }
    }
    return value;
  })
  .messages({
    "date.base": "Date of birth must be a valid date",
    "date.less": "Date of birth must be in the past",
    "any.invalid": "Invalid date of birth",
  })
  .optional(),

  genderSchema : Joi.string()
  .valid("Male", "Female", "Other")
  .required()
  .messages({
    "any.only": "Gender must be one of 'Male', 'Female', or 'Other'",
    "any.required": "Gender is required",
    "string.empty": "Gender cannot be empty",
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

// schema validation for event
const EventRegisterSchema = Joi.object({
  event_name: commonFields.name,
  description: commonFields.description,
  venue: commonFields.venue,
  google_map_link: commonFields.event_url,
  type_of_event: commonFields.type_of_event,
  number_of_days: commonFields.number_of_days,
  date_start: commonFields.date_start,
  date_end: commonFields.date_end, // issue 
  status: commonFields.status,
  event_qr: commonFields.event_qr,
  is_active: commonFields.is_active,
});

// schema validation for subevent

const SubEventRegisterSchema = Joi.object({
  name: commonFields.name,
  description: commonFields.description,
  date: commonFields.date,
  start_time: commonFields.start_time,
  end_time: commonFields.end_time,
  day: commonFields.day,
  quantity: commonFields.quantity,
  available_quantity: commonFields.available_quantity,
  images: commonFields.images,
});

const AttendeeValidSchema=Joi.object({
  name:commonFields.name,
  whatsapp:commonFields.whatsapp,
  email:commonFields.email,
  dob:commonFields.dob,
  gender:commonFields.genderSchema,
})

const BillingUserSchema=Joi.object({
  name:commonFields.name,
  whatsapp:commonFields.whatsapp,
  email:commonFields.email,
  address:commonFields.address,
  dob:commonFields.dob,
  gender:commonFields.genderSchema,
  mobile_no:commonFields.mobileNumber,
})

export {
  adminRegisterSchema,
  updatePasswordSchema,
  otpCheckSchema,
  employeeRegisterSchema,
  employeeUpdateSchema,
  EventRegisterSchema,
  SubEventRegisterSchema,
  AttendeeValidSchema,
  BillingUserSchema,
};
