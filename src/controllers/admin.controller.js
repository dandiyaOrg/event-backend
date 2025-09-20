import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {
  Admin,
  BillingUser,
  EventBillingUsers,
  Transaction,
} from "../db/models/index.js";
import { Op } from "sequelize";
import sendMail from "../utils/sendMail.js";

const registerAdmin = asyncHandler(async (req, res, next) => {
  try {
    const { name, mobile_no, email, address, password, organization } =
      req.body;

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
    console.error(error);
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const loginWithEmail = asyncHandler(async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!(email && password))
      return next(new ApiError(400, "email and password fields are required"));
    const admin = await Admin.findOne({
      where: { email },
    });
    if (!admin)
      return next(new ApiError(404, "Admin not found, please register first"));

    const isMatch = await admin.isPasswordCorrect(password);
    if (!isMatch) {
      return next(new ApiError(401, "Incorrect credentials"));
    }

    const otp = admin.generateEmailOTP();
    await admin.save();

    const { emailData, error } = await sendMail(
      admin.email,
      "sendVerificationOTP",
      {
        admin,
        otp,
        title: "Admin Login OTP Verification",
      }
    );
    if (!emailData) {
      return next(
        new ApiError(502, "Failed to send OTP email, please try again", error)
      );
    }
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
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const verifyOTPForLogin = asyncHandler(async (req, res, next) => {
  try {
    const { admin_id, otp } = req.body;
    if (!(admin_id && otp))
      return next(
        new ApiError(400, "Admin id and OTP is required for verification")
      );
    const admin = await Admin.findOne({
      where: { admin_id },
    });
    if (!admin)
      return next(new ApiError(404, "Admin not found, please register first"));

    const { success, message } = await admin.complete2FAVerification(otp);
    if (!success) {
      return next(new ApiError(400, message));
    }
    const accessToken = admin.generateAccessToken();
    const refreshToken = admin.generateRefreshToken();
    if (!(accessToken && refreshToken))
      return next(new ApiError(500, "Error generating tokens"));
    await admin.update({ refreshToken });
    res.setHeader("accessToken", accessToken);
    res.setHeader("refreshToken", refreshToken);
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
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const refreshAccessToken = asyncHandler(async (req, res, next) => {
  try {
    const { refreshToken } =
      req.cookies || req.header("refreshToken") || req.body;
    if (!refreshToken)
      return next(new ApiError(400, "Refresh Token is required"));
    let decodedtoken;
    try {
      decodedtoken = await jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
    } catch (err) {
      return next(new ApiError(401, "Token Expired Or Invalid", err));
    }

    const admin = await Admin.findUnique({
      where: { admin_id: decodedtoken.admin_id },
    });
    if (!admin)
      return next(new ApiError(404, "Admin not found, please register first"));

    if (refreshToken != admin.refreshToken)
      return next(new ApiError(401, "Refresh Token didn't matched"));

    const accessToken = admin.generateAccessToken();
    if (!accessToken) {
      return next(new ApiError(500, "Error generating access token"));
    }

    res.setHeader("accessToken", accessToken);
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
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const forgetPassword = asyncHandler(async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;
    if (!(email && newPassword))
      return next(
        new ApiError(400, "Admin email and new password are required")
      );
    const admin = await Admin.findOne({ where: { email } });
    if (!admin)
      return next(new ApiError(404, "Admin with provided email not Found"));

    const otp = admin.generateEmailOTP();
    await admin.save();
    const emailData = await sendMail(admin.email, "sendVerificationOTP", {
      admin,
      otp,
      title: "Password Reset OTP",
    });
    if (!emailData) {
      return next(
        new ApiError(502, "Failed to send OTP email, please try again")
      );
    }

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
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const verifyOTPForPasswordReset = asyncHandler(async (req, res, next) => {
  try {
    const { admin_id, otp, newPassword } = req.body;
    if (!(admin_id && otp))
      return next(
        new ApiError(
          400,
          "Admin id, OTP and new password are required for verification"
        )
      );
    const admin = await Admin.findOne({
      where: { admin_id },
    });
    if (!admin)
      return next(new ApiError(404, "Admin not found, please register first"));

    const { success, message } = await admin.complete2FAVerification(otp);
    if (!success) {
      return next(new ApiError(400, message));
    }

    await admin.update({ password: newPassword });

    return res
      .status(201)
      .json(new ApiResponse(201, {}, "Password updated successfully"));
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});
const getAdminDetails = asyncHandler(async (req, res, next) => {
  try {
    const admin_id = req.admin_id;
    if (!admin_id) return next(new ApiError(502, "Admin Id Not Found"));
    const admin = await Admin.findByPk(admin_id);
    if (!admin) return next(new ApiError(404, "Admin not Found"));
    return res
      .status(200)
      .json(new ApiResponse(200, admin, "Admin found successfully"));
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const getBillingUsersForAdmin = asyncHandler(async (req, res, next) => {
  try {
    const admin_id = req.admin_id;
    const page = parseInt(req.query.page) || 1;
    const limit = 25;
    const offset = (page - 1) * limit;

    const { count, rows: billingUsers } = await BillingUser.findAndCountAll({
      where: { admin_id },
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });

    const billingUserlist = billingUsers.map((biU) => ({
      billing_user_id: biU.billing_user_id,
      name: biU.name,
      mobile_no: biU.mobile_no,
      email: biU.email,
      whatsapp: biU.whatsapp,
      address: biU.address,
      dob: biU.dob,
      gender: biU.gender,
      age: biU.age,
    }));

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          billingUsers: billingUserlist,
          pagination: {
            totalBillingUsers: count,
            currentPage: page,
            totalPages,
            perPage: limit,
          },
        },
        "BillingUsers fetched successfully"
      )
    );
  } catch (error) {
    next(new ApiError(500, "Internal Server Error"));
  }
});

const getTransactionsForAdmin = asyncHandler(async (req, res, next) => {
  try {
    const admin_id = req.admin_id;
    const page = parseInt(req.query.page) || 1;
    const limit = 25;
    const offset = (page - 1) * limit;

    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where: { admin_id },
      limit,
      offset,
      order: [["datetime", "DESC"]],
    });

    const transactionList = transactions.map((tx) => ({
      transaction_id: tx.transaction_id,
      amount: tx.amount,
      datetime: tx.datetime,
      source_of_payment: tx.source_of_payment,
      status: tx.status,
      method_of_payment: tx.method_of_payment,
      razorpay_order_id: tx.razorpay_order_id,
      razorpay_payment_id: tx.razorpay_payment_id,
      order_id: tx.order_id,
      refund_amount: tx.refund_amount,
      refund_reason: tx.refund_reason,
    }));

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          transactions: transactionList,
          pagination: {
            totalTransactions: count,
            currentPage: page,
            totalPages,
            perPage: limit,
          },
        },
        "Transactions fetched successfully"
      )
    );
  } catch (error) {
    next(new ApiError(500, "Internal Server Error"));
  }
});
// get all the billing user corresponding to the event

const getAllBillingUserForEvent = asyncHandler(async (req, res, next) => {
  try {
    const { event_id } = req.query;

    if (!event_id) {
      return next(new ApiError(404, "Required EventId"));
    }

    const billingUsers = await EventBillingUsers.findAll({
      where: { event_id },
    });

    if (billingUsers.length === 0) {
      return next(
        new ApiError(404, "No Billing UserCorresponding to the EvrntId")
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(201, { billingUsers }, "Password updated successfully")
      );
  } catch (error) {
    console.error(error);
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
  getBillingUsersForAdmin,
  getAllBillingUserForEvent,
  getTransactionsForAdmin,
};
