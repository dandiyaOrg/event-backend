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
  description: Joi.string().min(10).max(2000).required().messages({
    "string.base": "Description must be a text",
    "string.empty": "Description is required",
    "string.min": "Description must be at least {#limit} characters",
    "string.max": "Description cannot exceed {#limit} characters",
    "any.required": "Description is required",
  }),
  event_type: Joi.string()
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
      "string.base": "Event type must be a text",
      "string.empty": "Event type is required",
      "any.only":
        "Event type must be one of conference, workshop, seminar, concert, exhibition, sports, festival, other",
      "any.required": "Event type is required",
    }),
  category: Joi.string()
    .valid(
      "Group",
      "Stag Male",
      "Stag Female",
      "Couple",
      "Full Pass"
    )
    .required()
    .message({
      "string.base": "Category must be a text",
      "string.empty": "Category is required.",
      "any.only": "Category must be one of Group, Stag Male, Stag Female, Couple, Full Pass.",
      "any.required": "Category is required."
  }),

  discount_percentage: Joi.number()
    .precision(2)
    .min(0)
    .max(100)
    .required()
    .messages({
      "number.base": "Discount percentage must be a number",
      "number.min": "Discount percentage cannot be negative",
      "number.max": "Discount percentage cannot exceed 100",
  }),

  venue: Joi.string().min(5).max(255).required().messages({
    "string.base": "Venue must be a text",
    "string.empty": "Venue is required",
    "string.min": "Venue must be at least {#limit} characters",
    "string.max": "Venue cannot exceed {#limit} characters",
    "any.required": "Venue is required",
  }),
  url: Joi.string().uri().required().messages({
    "string.base": "Google map link must be a text",
    "string.empty": "Google map link is required",
    "string.uri": "Google map link must be a valid URL",
    "any.required": "Google map link is required",
  }),
  integerSchema: Joi.number().integer().min(1).required().messages({
    "number.base": "Number of days must be a number",
    "number.integer": "Number of days must be an integer",
    "number.min": "Number of days must be at least {#limit}",
    "any.required": "Number of days is required",
  }),
  dateSchema: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
    .required()
    .messages({
      "string.pattern.name": "Date must be in YYYY-MM-DD format",
      "any.required": "Date is required",
    }),
  timeSchema: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, "HH:MM:SS")
    .required()
    .messages({
      "string.pattern.name": "Time must be in HH:MM:SS format",
      "any.required": "Time is required",
    }),
  event_status: Joi.string()
    .valid("Initiated", "Active", "Ready", "Closed", "Cancelled")
    .required()
    .messages({
      "string.base": "Event status must be a text",
      "string.empty": "Event status is required",
      "any.only": "Initiated, Active, Ready, Closed, Cancelled",
      "any.required": "Event status is required",
    }),
  gender: Joi.string().valid("Male", "Female", "Other").required().messages({
    "string.base": "Gender must be a text",
    "string.empty": "Gender is required",
    "any.only": "Male, Female, Other",
    "any.required": "Gender is required",
  }),
  idSchema: Joi.string().guid({ version: "uuidv4" }).required().messages({
    "string.guid": "Event ID must be a valid UUIDv4",
    "string.empty": "Event ID is required",
    "any.required": "Event ID is required",
  }),
  image: Joi.any().required().messages({
    "any.required": "Sub event image is required",
  }),
  amount: Joi.number().precision(2).min(0).required().messages({
    "number.base": "Amount must be a number",
    "number.min": "Amount cannot be negative",
    "any.required": "Amount is required",
  }),
  validity: Joi.number().integer().min(1).max(9).required().messages({
    "number.base": "Validity must be a number",
    "number.integer": "Validity must be an integer",
    "number.min": "Validity must be at least {#limit} day(s)",
    "number.max": "Validity cannot exceed {#limit} days",
  }),
};

// admin registration schema
const adminRegisterSchema = Joi.object({
  name: commonFields.name,
  mobile_no: commonFields.mobileNumber,
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

const eventRegisterSchema = Joi.object({
  event_name: commonFields.name,
  description: commonFields.description,
  venue: commonFields.venue,
  google_map_link: commonFields.url,
  number_of_days: commonFields.integerSchema,
  date_start: commonFields.dateSchema,
  date_end: commonFields.dateSchema,
  event_type: commonFields.event_type,
  image: commonFields.image,
});

const eventUpdateSchema = Joi.object({
  event_name: commonFields.name.optional(),
  description: commonFields.description.optional(),
  venue: commonFields.venue.optional(),
  google_map_link: commonFields.url.optional(),
  number_of_days: commonFields.integerSchema.optional(),
  date_start: commonFields.dateSchema.optional(),
  date_end: commonFields.dateSchema.optional(),
  event_type: commonFields.event_type.optional(),
  image: commonFields.image.optional(),
}).min(1);

const updateEventStatusSchema = Joi.object({
  status: commonFields.event_status.required(),
});

const subEventSchema = Joi.object({
  name: commonFields.name,
  event_id: commonFields.idSchema,
  date: commonFields.dateSchema,
  start_time: commonFields.timeSchema,
  end_time: commonFields.timeSchema,
  day: commonFields.integerSchema,
  quantity: commonFields.integerSchema,
  description: commonFields.description,
  image: commonFields.image,
});

const updateSubEventSchema = Joi.object({
  name: commonFields.name.optional(),
  date: commonFields.dateSchema.optional(),
  start_time: commonFields.timeSchema.optional(),
  end_time: commonFields.timeSchema.optional(),
  day: commonFields.integerSchema.optional(),
  quantity: commonFields.integerSchema.optional(),
  description: commonFields.description.optional(),
  image: commonFields.image.optional(),
}).min(1);

const createBillingUserSchema = Joi.object({
  name: commonFields.name,
  mobile_no: commonFields.mobileNumber,
  whatsapp: commonFields.mobileNumber,
  email: commonFields.email,
  address: commonFields.address,
  dob: commonFields.dateSchema,
  gender: commonFields.gender,
  event_id: commonFields.idSchema,
});

const attendeeSchema = Joi.object({
  name: commonFields.name,
  whatsapp: commonFields.mobileNumber,
  email: commonFields.email,
  dob: commonFields.dateSchema,
  gender: commonFields.gender,
  pass_id: commonFields.idSchema,
});

const createOrderSchema = Joi.object({
  subevent_id: commonFields.idSchema,
  billing_user_id: commonFields.idSchema,
  total_amount: commonFields.amount,
  attendees: Joi.array()
    .items(attendeeSchema)
    .min(1)
    .max(5)
    .required()
    .messages({
      "array.base": "Attendees must be an array",
      "array.min": "At least one attendee is required",
      "array.max": "Maximum five attendees allowed",
      "any.required": "Attendees are required",
    }),
});

const createPass = Joi.object({
  pass_id: commonFields.idSchema,
  category: commonFields.category,
  total_price: commonFields.amount,
  discount_percentage: commonFields.discount_percentage,
  validity: commonFields.validity,
  is_global: Joi.boolean().required(),
  is_active: Joi.boolean().required(),
})

const updatePassvalidation = Joi.object({
  category: commonFields.category.optional(),
  total_amount: commonFields.amount.optional(),
  discount_percentage: commonFields.discount_percentage.optional(),
  validity: commonFields.validity.optional(),
  is_global: Joi.boolean().optional(),
  is_active: Joi.boolean().optional(),
}).min(1);


export {
  adminRegisterSchema,
  updatePasswordSchema,
  otpCheckSchema,
  employeeRegisterSchema,
  employeeUpdateSchema,
  eventRegisterSchema,
  eventUpdateSchema,
  updateEventStatusSchema,
  subEventSchema,
  updateSubEventSchema,
  createBillingUserSchema,
  createOrderSchema,
  createPass,
  updatePassvalidation
};

// TODO: need dynamic message for commonFields
// commonFields.js

// export const amount = Joi.number()
//   .precision(2)
//   .min(0)
//   .required()
//   .label("Amount")
//   .messages({
//     "number.base": "{#label} must be a number",
//     "number.min": "{#label} cannot be negative",
//     "any.required": "{#label} is required",
//   });

// export const image = Joi.any()
//   .required()
//   .label("Image")
//   .messages({
//     "any.required": "{#label} is required",
//   });
// const schema = Joi.object({
//   total_amount: amount.label("total_amount"),
//   subevent_image: image.label("subevent_image"),
// });
