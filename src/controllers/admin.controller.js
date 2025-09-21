import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Admin, BillingUser ,EventBillingUsers,Transaction,Order,OrderItem } from "../db/models/index.js";
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

    if (!emailData) {
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

const getBillingUsersForAdmin = asyncHandler(async (req, res, next) => {
  try {
    const admin_id = req.admin_id;
    const page = parseInt(req.query.page) || 1;
    const limit = 25;
    const offset = (page - 1) * limit;
    logger.info("Querying billing users for admin", { admin_id, page, limit, offset });
    const { count, rows: billingUsers } = await BillingUser.findAndCountAll({
      where: { admin_id },
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });
    if (!billingUsers) {
      logger.error("Billing users not fetched successfully", {
        admin_id,
        page,
        query: { ...req.query }
      });
      return next(new ApiError(400, "Not able to query billing users"));
    }
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
    logger.info("Billing users queried successfully", {
      admin_id,
      page,
      count,
      totalPages
    });
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
    logger.error("Internal Server Error while fetching billing users", {
      stack: error.stack,
      admin_id: req.admin_id,
      page: req.query.page
    });
    next(new ApiError(500, "Internal Server Error"));
  }
});

const getTransactionsForAdmin = asyncHandler(async (req, res, next) => {
  try {
    const admin_id = req.admin_id;
    const page = parseInt(req.query.page) || 1;
    const limit = 25;
    const offset = (page - 1) * limit;
    logger.info("Querying transactions", { admin_id, page, limit, offset });
    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where: { admin_id },
      limit,
      offset,
      order: [["datetime", "DESC"]],
    });
    if(!transactions){
      logger.error("Transactions not fetched successfully", {
        admin_id,
        page,
        query: { ...req.query }
      });
      return next(new ApiError(400, "Not able to query transactions"));
    }
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
    logger.info("Transactions queried successfully", {
      admin_id,
      page,
      count,
      totalPages
    });

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
    logger.error("Internal Server Error while fetching transactions", {
      stack: error.stack,
      admin_id: req.admin_id,
      page: req.query.page
    });
    next(new ApiError(500, "Internal Server Error"));
  }
});

const getAllOrdersForAdmin = asyncHandler(async (req, res, next) => {
  try {
    const admin_id = req.admin_id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const offset = (page - 1) * limit;

    // build where clause, allow optional filters via query params
    const where = { admin_id };

    if (req.query.status) {
      where.status = req.query.status; // e.g. pending|confirmed|cancelled|expired
    }
    if (req.query.billing_user_id) {
      where.billing_user_id = req.query.billing_user_id;
    }
    if (req.query.from || req.query.to) {
      where.created_at = {};
      if (req.query.from) {
        // expect ISO date or yyyy-mm-dd; invalid dates will become Invalid Date
        const from = new Date(req.query.from);
        if (!Number.isNaN(from.getTime())) where.created_at[Op.gte] = from;
      }
      if (req.query.to) {
        const to = new Date(req.query.to);
        if (!Number.isNaN(to.getTime())) where.created_at[Op.lte] = to;
      }
      // if created_at ended up empty, delete it
      if (Object.keys(where.created_at).length === 0) delete where.created_at;
    }

    logger.info("Querying orders", { admin_id, page, limit, offset, filters: req.query });

    const { count, rows: orders } = await Order.findAndCountAll({
      where,
      limit,
      offset,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: OrderItem,
          as: "order_items",
          attributes: ["order_item_id", "product_id", "quantity", "unit_price", "total_price"]
        },
      ],
    });

    // build response list (plain objects)
    const orderList = orders.map((o) => {
      const plain = typeof o.get === "function" ? o.get({ plain: true }) : o;
      return {
        order_id: plain.order_id,
        razorpay_order_id: plain.razorpay_order_id,
        billing_user_id: plain.billing_user_id,
        admin_id: plain.admin_id,
        status: plain.status,
        total_amount: plain.total_amount,
        created_at: plain.created_at,
        updated_at: plain.updated_at,
        order_items: (plain.order_items || []).map((it) => it), // each item is a plain object
      };
    });

    const totalPages = Math.ceil(count / limit);

    logger.info("Orders queried successfully", { admin_id, page, count, totalPages });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          orders: orderList,
          pagination: {
            totalOrders: count,
            currentPage: page,
            totalPages,
            perPage: limit,
          },
        },
        "Orders fetched successfully"
      )
    );
  } catch (error) {
    logger.error("Internal Server Error while fetching orders", {
      stack: error.stack,
      admin_id: req.admin_id,
      query: req.query,
    });
    next(new ApiError(500, "Internal Server Error"));
  }
});

// get all the billing user corresponding to the event 

const getAllBillingUserForEvent = asyncHandler(async (req, res, next) => {
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
  getBillingUsersForAdmin,
  getAllBillingUserForEvent,
  getTransactionsForAdmin,
  getAllOrdersForAdmin
};