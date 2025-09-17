import { ApiError } from "../utils/ApiError.js";

const validateBody = (schema) => (req, res, next) => {
  if (req.file) {
    req.body.image = req.file?.path; // or req.file.filename if you prefer
  }
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return next(new ApiError(400, "Validation Error", errors));
  }
  next();
};

export default validateBody;
