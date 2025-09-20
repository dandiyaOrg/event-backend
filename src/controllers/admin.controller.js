import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Admin, BillingUser ,EventBillingUsers } from "../db/models/index.js";
import { Op } from "sequelize";
import sendMail from "../utils/sendMail.js";
import { logger } from "../app.js";

const registerAdmin = asyncHandler(async (req, res, next) => {
  try {
    const { name, mobile_no, email, address, password, organization } =
      req.body;

    logger.debug(`Registering admin with email: ${email}, mobile: ${mobile_no}`);

    const existingAdmin = await Admin.findOne({
      where: {
        [Op.or]: [{ email }, { mobile_no }],
      },
    });

    if (existingAdmin) {
      let msg =
        existingAdmin.email === email
          ? "Email is already registered"
          : "Mobile number is already registered";

      logger.warn(`Registration failed for ${email}: ${msg}`);
      return next(new ApiError(409, msg));
    }

    const newAdmin = await Admin.create({
      name,
      mobile_no,
      email,
      address,
      password,
      organization,
    });

    logger.info(`Admin registered successfully: ${newAdmin.id}`);
    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { user: newAdmin },
          "Admin registered successfully"
        )
      );
  } catch (error) {
    logger.error(`Error registering admin: ${error.message}`, { stack: error.stack });
    return next(new ApiError(500, "Internal Server Error", error));
  }
});


const loginWithEmail = asyncHandler(async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!(email && password)) {
      logger.warn("Login attempt with missing email or password");
      return next(new ApiError(400, "email and password fields are required"));
    }

    logger.debug(`Login attempt for email: ${email}`);

    const admin = await Admin.findOne({ where: { email } });
    if (!admin) {
      logger.warn(`Login failed: Admin not found for email ${email}`);
      return next(new ApiError(404, "Admin not found, please register first"));
    }

    const isMatch = await admin.isPasswordCorrect(password);
    if (!isMatch) {
      logger.warn(`Login failed: Incorrect password for email ${email}`);
      return next(new ApiError(401, "Incorrect credentials"));
    }

    const otp = admin.generateEmailOTP();
    await admin.save();
    logger.info(`OTP generated for admin ${admin.admin_id}`);

    const { emailData, error } = await sendMail(
      admin.email,
      "sendVerificationOTP",
      {
        admin,
        otp,
        title: "Admin Login OTP Verification",
      }
    );

    if (!emailData || !emailData.id) {
      logger.error(`Failed to send OTP email to ${admin.email}`, { error });
      return next(
        new ApiError(502, "Failed to send OTP email, please try again", error)
      );
    }

    logger.info(`OTP sent successfully to ${admin.email}`);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { admin_id: admin.admin_id },
          "OTP Sent successfully to the Email"
        )
      );
  } catch (error) {
    logger.error("Internal Server Error during admin login", { stack: error.stack });
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const verifyOTPForLogin = asyncHandler(async (req, res, next) => {
  try {
    const { admin_id, otp } = req.body;

    if (!(admin_id && otp)) {
      logger.warn("OTP verification attempt with missing admin_id or otp");
      return next(
        new ApiError(400, "Admin id and OTP is required for verification")
      );
    }

    logger.debug(`Verifying OTP for admin_id: ${admin_id}`);

    const admin = await Admin.findOne({ where: { admin_id } });
    if (!admin) {
      logger.warn(`OTP verification failed: Admin not found for id ${admin_id}`);
      return next(new ApiError(404, "Admin not found, please register first"));
    }

    const { success, message } = await admin.complete2FAVerification(otp);
    if (!success) {
      logger.warn(`OTP verification failed for admin ${admin_id}: ${message}`);
      return next(new ApiError(400, message));
    }

    const accessToken = admin.generateAccessToken();
    const refreshToken = admin.generateRefreshToken();

    if (!(accessToken && refreshToken)) {
      logger.error(`Token generation failed for admin ${admin_id}`);
      return next(new ApiError(500, "Error generating tokens"));
    }

    await admin.update({ refreshToken });

    res.setHeader("accessToken", accessToken);
    res.setHeader("refreshToken", refreshToken);

    logger.info(`Admin ${admin_id} logged in successfully via OTP`);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { admin, refreshToken, accessToken },
          "Admin logged in successfully"
        )
      );
  } catch (error) {
    logger.error("Internal Server Error during OTP verification", { stack: error.stack });
    return next(new ApiError(500, "Internal Server Error", error));
  }
});


const refreshAccessToken = asyncHandler(async (req, res, next) => {
  try {
    const { refreshToken } =
      req.cookies || req.header("refreshToken") || req.body;

    if (!refreshToken) {
      logger.warn("Refresh token missing in request");
      return next(new ApiError(400, "Refresh Token is required"));
    }

    let decodedtoken;
    try {
      decodedtoken = await jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
      logger.debug(`Decoded refresh token for admin_id: ${decodedToken.admin_id}`);
    } catch (err) {
      logger.warn("Invalid or expired refresh token", { error: err });
      return next(new ApiError(401, "Token Expired Or Invalid", err));
    }

    const admin = await Admin.findUnique({
      where: { admin_id: decodedtoken.admin_id },
    });

    if (!admin) {
      logger.warn(`Admin not found for refresh token: ${decodedToken.admin_id}`);
      return next(new ApiError(404, "Admin not found, please register first"));
    }

    if (refreshToken != admin.refreshToken) {
      logger.warn(`Refresh token mismatch for admin ${admin.admin_id}`);
      return next(new ApiError(401, "Refresh Token didn't match"));
    }

    const accessToken = admin.generateAccessToken();
    if (!accessToken) {
      logger.error(`Failed to generate access token for admin ${admin.admin_id}`);
      return next(new ApiError(500, "Error generating access token"));
    }

    res.setHeader("accessToken", accessToken);

    logger.info(`Access token refreshed successfully for admin ${admin.admin_id}`);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { admin, accessToken },
          "Access Token refreshed successfully"
        )
      );
  } catch (error) {
    logger.error("Internal Server Error during token refresh", { stack: error.stack });
    return next(new ApiError(500, "Internal Server Error", error));
  }
});


const forgetPassword = asyncHandler(async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;

    if (!(email && newPassword)) {
      logger.warn("Forget password attempt with missing email or newPassword");
      return next(
        new ApiError(400, "Admin email and new password are required")
      );
    }

    logger.debug(`Forget password request for email: ${email}`);

    const admin = await Admin.findOne({ where: { email } });
    if (!admin) {
      logger.warn(`Admin not found for forget password request: ${email}`);
      return next(new ApiError(404, "Admin with provided email not Found"));
    }

    const otp = admin.generateEmailOTP();
    await admin.save();
    logger.info(`OTP generated for password reset for admin ${admin.admin_id}`);

    const emailData = await sendMail(admin.email, "sendVerificationOTP", {
      admin,
      otp,
      title: "Password Reset OTP",
    });

    if (!emailData || !emailData.id) {
      logger.error(`Failed to send password reset OTP email to ${admin.email}`);
      return next(
        new ApiError(502, "Failed to send OTP email, please try again")
      );
    }

    logger.info(`Password reset OTP sent successfully to ${admin.email}`);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { admin_id: admin.admin_id, newPassword },
          "Email sent for password Reset"
        )
      );
  } catch (error) {
    logger.error("Internal Server Error during forget password", { stack: error.stack });
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const verifyOTPForPasswordReset = asyncHandler(async (req, res, next) => {
  try {
    const { admin_id, otp, newPassword } = req.body;

    if (!(admin_id && otp)) {
      logger.warn("Password reset verification attempt with missing fields", { admin_id });
      return next(
        new ApiError(
          400,
          "Admin id, OTP and new password are required for verification"
        )
      );
    }

    logger.debug(`Verifying password reset OTP for admin_id: ${admin_id}`);

    const admin = await Admin.findOne({ where: { admin_id } });
    if (!admin) {
      logger.warn(`Admin not found for password reset OTP verification: ${admin_id}`);
      return next(new ApiError(404, "Admin not found, please register first"));
    }

    const { success, message } = await admin.complete2FAVerification(otp);
    if (!success) {
      logger.warn(`OTP verification failed for admin ${admin_id}: ${message}`);
      return next(new ApiError(400, message));
    }

    await admin.update({ password: newPassword });
    logger.info(`Password updated successfully for admin ${admin_id}`);

    return res
      .status(201)
      .json(new ApiResponse(201, {}, "Password updated successfully"));
  } catch (error) {
    logger.error("Internal Server Error during password reset OTP verification", { stack: error.stack });
    return next(new ApiError(500, "Internal Server Error", error));
  }
});
const getAdminDetails = asyncHandler(async (req, res, next) => {
  try {
    const admin_id = req.admin_id;

    if (!admin_id) {
      logger.warn("Admin details request missing admin_id");
      return next(new ApiError(502, "Admin Id Not Found"));
    }

    logger.debug(`Fetching admin details for admin_id: ${admin_id}`);

    const admin = await Admin.findByPk(admin_id);
    if (!admin) {
      logger.warn(`Admin not found for admin_id: ${admin_id}`);
      return next(new ApiError(404, "Admin not Found"));
    }

    logger.info(`Admin details fetched successfully for admin_id: ${admin_id}`);
    return res
      .status(200)
      .json(new ApiResponse(200, admin, "Admin found successfully"));
  } catch (error) {
    logger.error("Internal Server Error while fetching admin details", { stack: error.stack });
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const getBillingUserToAdminId = asyncHandler(async (req, res, next) => {
  try {
    const admin_id = req.admin_id;

    if (!admin_id) {
      logger.warn("Billing users request missing admin_id");
      return next(new ApiError(400, "Admin Id is required"));
    }

    logger.debug(`Fetching billing users for admin_id: ${admin_id}`);

    // Find all the billing users corresponding to that admin_id
    const allBillingUsers = await BillingUser.findAll({
      where: { admin_id },
    });

    if (!allBillingUsers || allBillingUsers.length === 0) {
      logger.info(`No billing users found for admin_id: ${admin_id}`);
      return res.status(404).json(
        new ApiResponse(
          200,
          allBillingUsers,
          "No Billing User Found Corresponding to this Admin_Id"
        )
      );
    }

    logger.info(`Fetched ${allBillingUsers.length} billing users for admin_id: ${admin_id}`);
    return res.status(200).json(
      new ApiResponse(200, allBillingUsers, "Data of all the Billing User")
    );
  } catch (error) {
    logger.error("Internal Server Error while fetching billing users", { stack: error.stack });
    next(new ApiError(500, "Internal Server Error"));
  }
});


// get all the billing user corresponding to the event 

const GetAllBillingUserToEvnt = asyncHandler(async (req, res, next) => {
  try {
    const { event_id } = req.query;

    if (!event_id) {
      logger.warn("GetAllBillingUserToEvnt request missing event_id");
      return next(new ApiError(404, "Required EventId"));
    }

    logger.debug(`Fetching billing users for event_id: ${event_id}`);

    const billingUsers = await EventBillingUsers.findAll({
      where: { event_id },
    });

    if (!billingUsers || billingUsers.length === 0) {
      logger.info(`No billing users found for event_id: ${event_id}`);
      return next(
        new ApiError(404, "No Billing User Corresponding to the EventId")
      );
    }

    logger.info(`Fetched ${billingUsers.length} billing users for event_id: ${event_id}`);
    return res
      .status(200)
      .json(
        new ApiResponse(
          201,
          { billingUsers },
          "Billing users fetched successfully"
        )
      );
  } catch (error) {
    logger.error("Internal Server Error while fetching billing users for event", { stack: error.stack });
    return next(new ApiError(500, "Internal Server Error", error));
  }
});


export {
  loginWithEmail,
  refreshAccessToken,
  forgetPassword,
  registerAdmin,
  verifyOTPForLogin,
  getAdminDetails,
  verifyOTPForPasswordReset,
  getBillingUserToAdminId,
  GetAllBillingUserToEvnt
};
