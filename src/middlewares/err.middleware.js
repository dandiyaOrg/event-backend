import { ApiError } from "../utils/ApiError.js";
const errHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statuscode).json({
      success: err.success,
      statusCode: err.statuscode,
      message: err.message,
      errors: err.errors,
    });
  }

  // For other types of errors
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
    errors: [err.message],
    statusCode: 500,
  });
};

export { errHandler };
