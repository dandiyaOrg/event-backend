import Joi from "joi";

// common schema
export const commonFields = {
  name: Joi.string().min(2).max(100).required().messages({
    "string.base": "{#label} must be a text",
    "string.empty": "{#label} is required",
    "string.min": "{#label} must be at least {#limit} characters",
    "string.max": "{#label} cannot exceed {#limit} characters",
    "any.required": "{#label} is required",
  }),

  mobileNumber: Joi.string()
    .pattern(/^[6-9]\d{9}$/) // More specific pattern for Indian mobile numbers
    .required()
    .messages({
      "string.base": "{#label} must be a text",
      "string.pattern.base": "{#label} must be a valid 10-digit mobile number",
      "string.empty": "{#label} is required",
      "any.required": "{#label} is required",
    }),

  email: Joi.string().email().required().messages({
    "string.base": "{#label} must be a text",
    "string.email": "Please provide a valid {#label}",
    "string.empty": "{#label} is required",
    "any.required": "{#label} is required",
  }),

  address: Joi.string()
    .min(10)
    .max(255)
    .pattern(/^[a-zA-Z0-9\s,.'\-#\n\/]+$/) // Added forward slash for addresses
    .required()
    .messages({
      "string.base": "{#label} must be a text",
      "string.empty": "{#label} is required",
      "string.min": "{#label} must be at least {#limit} characters",
      "string.max": "{#label} cannot exceed {#limit} characters",
      "string.pattern.base": "{#label} contains invalid characters",
      "any.required": "{#label} is required",
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
      "string.base": "{#label} must be a text",
      "string.empty": "{#label} is required",
      "string.min": "{#label} must be at least {#limit} characters",
      "string.max": "{#label} cannot exceed {#limit} characters",
      "string.pattern.base":
        "{#label} must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      "any.required": "{#label} is required",
    }),

  organization: Joi.string().max(200).required().messages({
    "string.base": "{#label} must be a text",
    "string.empty": "{#label} is required",
    "string.max": "{#label} cannot exceed {#limit} characters",
    "any.required": "{#label} is required",
  }),

  otp: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/) // Ensure OTP contains only digits
    .required()
    .messages({
      "string.base": "{#label} must be a text",
      "string.length": "{#label} must be {#limit} characters long",
      "string.pattern.base": "{#label} must contain only digits",
      "string.empty": "{#label} is required",
      "any.required": "{#label} is required",
    }),

  username: Joi.string()
    .min(6)
    .max(50) // Added max length for username
    .pattern(/^[a-zA-Z0-9_]+$/) // Username pattern
    .required()
    .messages({
      "string.base": "{#label} must be a text",
      "string.empty": "{#label} is required",
      "string.min": "{#label} must be at least {#limit} characters",
      "string.max": "{#label} cannot exceed {#limit} characters",
      "string.pattern.base":
        "{#label} can only contain letters, numbers, and underscores",
      "any.required": "{#label} is required",
    }),

  description: Joi.string().min(10).max(2000).required().messages({
    "string.base": "{#label} must be a text",
    "string.empty": "{#label} is required",
    "string.min": "{#label} must be at least {#limit} characters",
    "string.max": "{#label} cannot exceed {#limit} characters",
    "any.required": "{#label} is required",
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
      "string.base": "{#label} must be a text",
      "string.empty": "{#label} is required",
      "any.only":
        "{#label} must be one of: conference, workshop, seminar, concert, exhibition, sports, festival, other",
      "any.required": "{#label} is required",
    }),

  pass_category: Joi.string()
    .valid("Group", "Stag Male", "Stag Female", "Couple", "Full Pass")
    .required()
    .messages({
      // Fixed typo: was .message() now .messages()
      "string.base": "{#label} must be a text",
      "string.empty": "{#label} is required",
      "any.only":
        "{#label} must be one of: Group, Stag Male, Stag Female, Couple, Full Pass",
      "any.required": "{#label} is required",
    }),

  discount_percentage: Joi.number()
    .precision(2)
    .min(0)
    .max(100)
    .required()
    .messages({
      "number.base": "{#label} must be a number",
      "number.precision":
        "{#label} cannot have more than {#limit} decimal places",
      "number.min": "{#label} cannot be negative",
      "number.max": "{#label} cannot exceed {#limit}%",
      "any.required": "{#label} is required",
    }),

  venue: Joi.string().min(5).max(255).required().messages({
    "string.base": "{#label} must be a text",
    "string.empty": "{#label} is required",
    "string.min": "{#label} must be at least {#limit} characters",
    "string.max": "{#label} cannot exceed {#limit} characters",
    "any.required": "{#label} is required",
  }),

  url: Joi.string().uri().required().messages({
    "string.base": "{#label} must be a text",
    "string.empty": "{#label} is required",
    "string.uri": "{#label} must be a valid URL",
    "any.required": "{#label} is required",
  }),

  integerSchema: Joi.number().integer().min(1).required().messages({
    "number.base": "{#label} must be a number",
    "number.integer": "{#label} must be an integer",
    "number.min": "{#label} must be at least {#limit}",
    "any.required": "{#label} is required",
  }),

  dateSchema: Joi.date()
    .iso() // Use Joi's built-in date validation
    .required()
    .messages({
      "date.base": "{#label} must be a valid date",
      "date.format": "{#label} must be in YYYY-MM-DD format",
      "any.required": "{#label} is required",
    }),

  timeSchema: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, "HH:MM:SS")
    .required()
    .messages({
      "string.base": "{#label} must be a text",
      "string.pattern.name": "{#label} must be in HH:MM:SS format",
      "any.required": "{#label} is required",
    }),

  event_status: Joi.string()
    .valid("Initiated", "Active", "Ready", "Closed", "Cancelled")
    .required()
    .messages({
      "string.base": "{#label} must be a text",
      "string.empty": "{#label} is required",
      "any.only":
        "{#label} must be one of: Initiated, Active, Ready, Closed, Cancelled",
      "any.required": "{#label} is required",
    }),

  gender: Joi.string().valid("Male", "Female", "Other").required().messages({
    "string.base": "{#label} must be a text",
    "string.empty": "{#label} is required",
    "any.only": "{#label} must be one of: Male, Female, Other",
    "any.required": "{#label} is required",
  }),

  idSchema: Joi.string().guid({ version: "uuidv4" }).required().messages({
    "string.base": "{#label} must be a text",
    "string.guid": "{#label} must be a valid UUIDv4",
    "string.empty": "{#label} is required",
    "any.required": "{#label} is required",
  }),

  image: Joi.any().required().messages({
    "any.required": "{#label} is required",
  }),

  amount: Joi.number().precision(2).min(0).required().messages({
    "number.base": "{#label} must be a number",
    "number.precision":
      "{#label} cannot have more than {#limit} decimal places",
    "number.min": "{#label} cannot be negative",
    "any.required": "{#label} is required",
  }),

  validity: Joi.number().integer().min(1).max(365).required().messages({
    // Increased max to 365 days
    "number.base": "{#label} must be a number",
    "number.integer": "{#label} must be an integer",
    "number.min": "{#label} must be at least {#limit} day(s)",
    "number.max": "{#label} cannot exceed {#limit} days",
    "any.required": "{#label} is required",
  }),
  is_active: Joi.boolean().required().messages({
    "boolean.base": "{#label} must be a boolean value",
  }),
};

// admin registration schema
const adminRegisterSchema = Joi.object({
  name: commonFields.name.label("Name"),
  mobile_no: commonFields.mobileNumber.label("Mobile Number"),
  email: commonFields.email.label("Email"),
  address: commonFields.address.label("Address"),
  password: commonFields.password.label("Password"),
  organization: commonFields.organization.label("Organization"),
});

const employeeRegisterSchema = Joi.object({
  name: commonFields.name.label("Name"),
  mobile_no: commonFields.mobileNumber.label("Mobile Number"),
  email: commonFields.email.label("Email"),
  password: commonFields.password.label("Password"),
  username: commonFields.username.label("Username"),
});

const employeeUpdateSchema = Joi.object({
  name: commonFields.name.optional().label("Name"),
  mobile_no: commonFields.mobileNumber.optional().label("Mobile Number"),
  email: commonFields.email.optional().label("Email"),
  password: commonFields.password.optional().label("Password"),
  username: commonFields.username.optional().label("Username"),
  is_active: commonFields.is_active.label("Active Status"),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

const updatePasswordSchema = Joi.object({
  newPassword: commonFields.password.label("New Password"),
}).unknown(true);

const otpCheckSchema = Joi.object({
  otp: commonFields.otp.label("OTP"),
}).unknown(true);

const eventRegisterSchema = Joi.object({
  event_name: commonFields.name.label("Event Name"),
  description: commonFields.description.label("Description"),
  venue: commonFields.venue.label("Venue"),
  google_map_link: commonFields.url.label("Google Map Link"),
  number_of_days: commonFields.integerSchema.label("Number of Days"),
  date_start: commonFields.dateSchema.label("Start Date"),
  date_end: commonFields.dateSchema.label("End Date"),
  event_type: commonFields.event_type.label("Event Type"),
  image: commonFields.image.label("Event Image"),
})
  .custom((value, helpers) => {
    // Custom validation to ensure end date is after start date
    if (new Date(value.date_end) <= new Date(value.date_start)) {
      return helpers.error("any.custom", {
        message: "End Date must be after Start Date",
      });
    }
    return value;
  })
  .messages({
    "any.custom": "{#message}",
  });

const eventUpdateSchema = Joi.object({
  event_name: commonFields.name.optional().label("Event Name"),
  description: commonFields.description.optional().label("Description"),
  venue: commonFields.venue.optional().label("Venue"),
  google_map_link: commonFields.url.optional().label("Google Map Link"),
  number_of_days: commonFields.integerSchema.optional().label("Number of Days"),
  date_start: commonFields.dateSchema.optional().label("Start Date"),
  date_end: commonFields.dateSchema.optional().label("End Date"),
  event_type: commonFields.event_type.optional().label("Event Type"),
  image: commonFields.image.optional().label("Event Image"),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

const updateEventStatusSchema = Joi.object({
  status: commonFields.event_status.label("Event Status"),
});

const subEventSchema = Joi.object({
  name: commonFields.name.label("Sub Event Name"),
  event_id: commonFields.idSchema.label("Event ID"),
  date: commonFields.dateSchema.label("Date"),
  start_time: commonFields.timeSchema.label("Start Time"),
  end_time: commonFields.timeSchema.label("End Time"),
  day: commonFields.integerSchema.label("Day"),
  quantity: commonFields.integerSchema.label("Quantity"),
  description: commonFields.description.label("Description"),
  image: commonFields.image.label("Sub Event Image"),
});

const updateSubEventSchema = Joi.object({
  name: commonFields.name.optional().label("Sub Event Name"),
  date: commonFields.dateSchema.optional().label("Date"),
  start_time: commonFields.timeSchema.optional().label("Start Time"),
  end_time: commonFields.timeSchema.optional().label("End Time"),
  day: commonFields.integerSchema.optional().label("Day"),
  quantity: commonFields.integerSchema.optional().label("Quantity"),
  description: commonFields.description.optional().label("Description"),
  image: commonFields.image.optional().label("Sub Event Image"),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

const createBillingUserSchema = Joi.object({
  name: commonFields.name.label("Name"),
  mobile_no: commonFields.mobileNumber.label("Mobile Number"),
  whatsapp: commonFields.mobileNumber.label("WhatsApp Number"),
  email: commonFields.email.label("Email"),
  address: commonFields.address.label("Address"),
  dob: commonFields.dateSchema.label("Date of Birth"),
  gender: commonFields.gender.label("Gender"),
  event_id: commonFields.idSchema.label("Event ID"),
});

const attendeeSchema = Joi.object({
  name: commonFields.name.label("Attendee Name"),
  whatsapp: commonFields.mobileNumber.label("WhatsApp Number"),
  email: commonFields.email.label("Email"),
  dob: commonFields.dateSchema.label("Date of Birth"),
  gender: commonFields.gender.label("Gender"),
  pass_id: commonFields.idSchema.label("Pass ID"),
});

const createOrderSchema = Joi.object({
  subevent_id: commonFields.idSchema.label("Sub Event ID"),
  billing_user_id: commonFields.idSchema.label("Billing User ID"),
  total_amount: commonFields.amount.label("Total Amount"),
  attendees: Joi.array()
    .items(attendeeSchema)
    .min(1)
    .max(5)
    .required()
    .label("Attendees")
    .messages({
      "array.base": "{#label} must be an array",
      "array.min": "At least {#limit} attendee is required",
      "array.max": "Maximum {#limit} attendees allowed",
      "any.required": "{#label} are required",
    }),
});

const createPass = Joi.object({
  subevent_id: commonFields.idSchema.optional().label("Sub Event ID"),
  event_id: commonFields.idSchema.optional().label("Event ID"),
  category: commonFields.pass_category.label("Pass Category"),
  total_price: commonFields.amount.label("Total Price"),
  discount_percentage: commonFields.discount_percentage.label(
    "Discount Percentage"
  ),
  validity: commonFields.validity.optional().label("Validity"),
  is_global: commonFields.is_active.optional().label("Is Global"),
  is_active: Joi.boolean().optional().label("Is Active").messages({
    "boolean.base": "{#label} must be a boolean value",
  }),
})
  .or("subevent_id", "event_id")
  .messages({
    "object.missing": "Either Sub Event ID or Event ID must be provided",
  });

const updatePassvalidation = Joi.object({
  discount_percentage: commonFields.discount_percentage,
});

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
  updatePassvalidation,
};
