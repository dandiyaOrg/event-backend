import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import Admin from "../db/models/admin.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) return next(new ApiError(401, "Unauthorized request"));

    const decodedtoken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (!decodedtoken)
      return next(new ApiError(400, "Token Expired or invalid"));
    const admin = await Admin.findByPk(decodedtoken?.admin_id);
    if (!admin) return next(new ApiError(401, "Invalid Access Token"));
    req.admin_id = admin.admin_id;
    next();
  } catch (error) {
    return next(new ApiError(401, error?.message || "Invalid Access Token"));
  }
});
