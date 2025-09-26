import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {
  Admin,
  BillingUser,
  EventBillingUsers,
  Transaction,
  Attendee,
  Event,
  Order,
  OrderItemAttendee,
  SubEvent,
  SubEventAttendee,
  OrderItem,
  Pass,
} from "../db/models/index.js";
import { Op } from "sequelize";
import jwt from "jsonwebtoken";
import { sendMail } from "../utils/sendMail.js";
import { logger } from "../app.js";
import { validate as isUUID } from "uuid";

const registerAdmin = asyncHandler(async (req, res, next) => {
  try {
    const { name, mobile_no, email, address, password, organization } =
      req.body;

    logger.debug(
      `Registering admin with email: ${email}, mobile: ${mobile_no}`
    );

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
    logger.error(`Error registering admin: ${error.message}`, {
      stack: error.stack,
    });
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
    logger.error("Internal Server Error during admin login", {
      stack: error.stack,
    });
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
      logger.warn(
        `OTP verification failed: Admin not found for id ${admin_id}`
      );
      return next(new ApiError(404, "Admin not found, please register first"));
    }

    const { success, message } = await admin.complete2FAVerification(otp);
    if (!success) {
      logger.warn(`OTP verification failed for admin ${admin_id}: ${message}`);
      return next(new ApiError(400, message));
    }

    const accessToken = admin.generateAccessToken();
    const refreshToken = await admin.generateRefreshToken();

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
    logger.error("Internal Server Error during OTP verification", {
      stack: error.stack,
    });
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const refreshAccessToken = asyncHandler(async (req, res, next) => {
  try {
    const refreshToken =
      req.cookies?.refreshToken ||
      req.get("refreshToken") ||
      req.body?.refreshToken;

    if (!refreshToken) {
      logger.warn("Refresh token missing in request");
      return next(new ApiError(400, "Refresh Token is required"));
    }

    let decodedToken;
    try {
      decodedToken = await jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
      logger.debug(
        `Decoded refresh token for admin_id: ${decodedToken.admin_id}`
      );
    } catch (err) {
      logger.warn("Invalid or expired refresh token", { error: err });
      return next(new ApiError(401, "Token Expired Or Invalid", err));
    }

    const admin = await Admin.findByPk(decodedToken?.admin_id);

    if (!admin) {
      logger.warn(
        `Admin not found for refresh token: ${decodedToken.admin_id}`
      );
      return next(new ApiError(404, "Admin not found, please register first"));
    }

    if (refreshToken != admin.refreshToken) {
      logger.warn(`Refresh token mismatch for admin ${admin.admin_id}`);
      return next(new ApiError(401, "Refresh Token didn't match"));
    }

    const accessToken = admin.generateAccessToken();
    if (!accessToken) {
      logger.error(
        `Failed to generate access token for admin ${admin.admin_id}`
      );
      return next(new ApiError(500, "Error generating access token"));
    }

    res.setHeader("accessToken", accessToken);

    logger.info(
      `Access token refreshed successfully for admin ${admin.admin_id}`
    );
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
    logger.error("Internal Server Error during token refresh", {
      stack: error.stack,
    });
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
    logger.error("Internal Server Error during forget password", {
      stack: error.stack,
    });
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const verifyOTPForPasswordReset = asyncHandler(async (req, res, next) => {
  try {
    const { admin_id, otp, newPassword } = req.body;

    if (!(admin_id && otp)) {
      logger.warn("Password reset verification attempt with missing fields", {
        admin_id,
      });
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
      logger.warn(
        `Admin not found for password reset OTP verification: ${admin_id}`
      );
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
    logger.error(
      "Internal Server Error during password reset OTP verification",
      { stack: error.stack }
    );
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
    logger.error("Internal Server Error while fetching admin details", {
      stack: error.stack,
    });
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const getBillingUsersForAdmin = asyncHandler(async (req, res, next) => {
  try {
    const admin_id = req.admin_id;
    const page = parseInt(req.query.page) || 1;
    const limit = 25;
    const offset = (page - 1) * limit;
    logger.info("Querying billing users for admin", {
      admin_id,
      page,
      limit,
      offset,
    });
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
        query: { ...req.query },
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
      totalPages,
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
      page: req.query.page,
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
    if (!transactions) {
      logger.error("Transactions not fetched successfully", {
        admin_id,
        page,
        query: { ...req.query },
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
      totalPages,
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
      page: req.query.page,
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

    logger.info("Querying orders", {
      admin_id,
      page,
      limit,
      offset,
      filters: req.query,
    });

    const { count, rows: orders } = await Order.findAndCountAll({
      where,
      limit,
      offset,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: OrderItem,
          as: "order_items",
          attributes: [
            "order_item_id",
            "product_id",
            "quantity",
            "unit_price",
            "total_price",
          ],
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

    logger.info("Orders queried successfully", {
      admin_id,
      page,
      count,
      totalPages,
    });

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
    const { eventId } = req.params;

    if (!eventId) {
      logger.warn("GetAllBillingUserToEvnt request missing event_id");
      return next(new ApiError(404, "Required EventId"));
    }

    logger.debug(`Fetching billing users for event_id: ${eventId}`);

    const billingUsers = await EventBillingUsers.findAll({
      where: { eventId },
    });

    if (!billingUsers || billingUsers.length === 0) {
      logger.info(`No billing users found for eventId: ${eventId}`);
      return next(
        new ApiError(404, "No Billing User Corresponding to the EventId")
      );
    }

    logger.info(
      `Fetched ${billingUsers.length} billing users for eventId: ${eventId}`
    );
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
    logger.error(
      "Internal Server Error while fetching billing users for event",
      { stack: error.stack }
    );
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const getOrderDetails = asyncHandler(async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const admin_id = req.admin_id;

    if (!orderId || !isUUID(orderId)) {
      logger.warn("Missing or wrong orderId", { orderId });
      return next(new ApiError(404, "Missing Or Wrong UUID"));
    }

    if (!admin_id) {
      logger.warn("Missing admin_id on request");
      return next(new ApiError(401, "Unauthorized"));
    }

    logger.debug(
      `Fetching order details for order_id: ${orderId}, admin_id: ${admin_id}`
    );

    // Single query using associations/aliases you defined in your models/index
    const order = await Order.findOne({
      where: { order_id: orderId, admin_id },
      include: [
        { model: BillingUser, as: "billing_user", required: false },
        { model: Transaction, as: "transaction", required: false },
        {
          model: OrderItem,
          as: "order_items",
          required: false,
          include: [
            { model: Pass, as: "pass", required: false },
            {
              model: OrderItemAttendee,
              as: "orderItemAttendees",
              required: false,
              attributes: [
                "order_item_attendee_id",
                "assigned_date",
                "created_at",
              ], // keep join meta if you want; not required
              include: [
                {
                  model: Attendee,
                  as: "attendee",
                  required: false,
                  attributes: [
                    "attendee_id",
                    "name",
                    "whatsapp",
                    "email",
                    "dob",
                    "gender",
                    "age",
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!order) {
      logger.info("Order not found or not accessible by admin", {
        orderId,
        admin_id,
      });
      return next(new ApiError(404, "Order not found"));
    }

    const o = typeof order.toJSON === "function" ? order.toJSON() : order;

    // Build response exactly in the shape you requested
    const responsePayload = {
      order_id: o.order_id,
      razorpay_order_id: o.razorpay_order_id,
      billing_user_id: o.billing_user_id,
      status: o.status,
      total_amount: o.total_amount,
      created_at: o.created_at,
      updated_at: o.updated_at,
      order_items: (o.order_items || []).map((item) => {
        // some items may be plain objects or sequelize instances
        const it = typeof item.toJSON === "function" ? item.toJSON() : item;

        // pass shape
        const pass = it.pass
          ? {
              pass_id: it.pass.pass_id,
              category: it.pass.category,
              total_price: it.pass.total_price,
              discount_percentage: it.pass.discount_percentage,
              final_price: it.pass.final_price,
              validity: it.pass.validity,
              is_global: it.pass.is_global,
              is_active: it.pass.is_active,
            }
          : null;

        // attendees: map through orderItemAttendees -> attendee
        const attendees =
          (it.orderItemAttendees || [])
            .map((oia) => {
              const joi = typeof oia.toJSON === "function" ? oia.toJSON() : oia;
              const a = joi.attendee;
              if (!a) return null;
              const at = typeof a.toJSON === "function" ? a.toJSON() : a;
              return {
                attendee_id: at.attendee_id,
                name: at.name,
                whatsapp: at.whatsapp,
                email: at.email,
                dob: at.dob,
                gender: at.gender,
                age: at.age,
              };
            })
            .filter(Boolean) || [];

        return {
          order_item_id: it.order_item_id,
          pass_id: it.pass_id,
          quantity: it.quantity,
          price: it.price,
          pass,
          attendees,
        };
      }),
    };

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          responsePayload,
          "Order details fetched successfully"
        )
      );
  } catch (error) {
    logger.error("Internal Server Error while fetching order details", {
      message: error.message,
      stack: error.stack,
    });
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const getAllEventsAttendees = asyncHandler(async (req, res, next) => {
  try {
    const admin_id = req.admin_id;
    if (!admin_id) {
      logger.warn("Missing admin_id on request");
      return next(new ApiError(401, "Unauthorized"));
    }

    logger.debug(
      `Fetching events -> subevents -> attendees for admin_id: ${admin_id}`
    );

    const events = await Event.findAll({
      where: { admin_id },
      attributes: [
        "event_id",
        "event_name",
        "description",
        "created_at",
        "updated_at",
      ],
      include: [
        {
          model: SubEvent,
          as: "subevents",
          required: false,
          attributes: [
            "subevent_id",
            "name",
            "date",
            "start_time",
            "end_time",
            "day",
            "quantity",
            "available_quantity",
            "is_active",
          ],
          include: [
            // explicit join-model include — robust and exposes join metadata
            {
              model: SubEventAttendee,
              as: "subeventAttendees", // must match your associations
              required: false,
              attributes: ["subevent_attendee_id", "created_at"], // join metadata
              include: [
                {
                  model: Attendee,
                  as: "attendee",
                  required: false,
                  attributes: [
                    "attendee_id",
                    "name",
                    "whatsapp",
                    "email",
                    "dob",
                    "gender",
                    "age",
                  ],
                },
              ],
            },
          ],
        },
      ],
      order: [
        ["created_at", "DESC"],
        [{ model: SubEvent, as: "subevents" }, "date", "ASC"],
      ],
    });

    if (!events.length) {
      logger.info(`No events found for admin_id: ${admin_id}`);
      return res
        .status(204)
        .json(new ApiResponse(204, { events: [] }, "No events found"));
    }
    // build payload
    const payloadEvents = (events || []).map((ev) => {
      const e = ev.toJSON ? ev.toJSON() : ev;
      return {
        event_id: e.event_id,
        name: e.name,
        description: e.description,
        created_at: e.created_at,
        updated_at: e.updated_at,
        subevents: (e.subevents || []).map((se) => {
          const s = se.toJSON ? se.toJSON() : se;
          return {
            subevent_id: s.subevent_id,
            name: s.name,
            date: s.date,
            start_time: s.start_time,
            end_time: s.end_time,
            day: s.day,
            quantity: s.quantity,
            available_quantity: s.available_quantity,
            is_active: s.is_active,
            attendees:
              (s.subeventAttendees || [])
                .map((jr) => {
                  const joinRow = jr.toJSON ? jr.toJSON() : jr;
                  const a = joinRow.attendee || {};
                  if (!a.attendee_id) return null;
                  return {
                    attendee_id: a.attendee_id,
                    name: a.name,
                    whatsapp: a.whatsapp,
                    email: a.email,
                    dob: a.dob,
                    gender: a.gender,
                    age: a.age,
                    // join metadata
                    subevent_attendee_id: joinRow.subevent_attendee_id,
                    registered_at: joinRow.created_at,
                  };
                })
                .filter(Boolean) || [],
          };
        }),
      };
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { events: payloadEvents },
          "Events, subevents and attendees fetched successfully"
        )
      );
  } catch (error) {
    logger.error("Internal Server Error while fetching attendees by admin", {
      message: error.message,
      stack: error.stack,
      sql: error?.sql || null,
    });

    if (error?.parent?.code === "42703") {
      // helpful hint for future debugging
      return next(
        new ApiError(
          500,
          "Database column not found. Check model <-> DB column names (see server logs for SQL)."
        )
      );
    }
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const getAllAttendeesForAdmin = asyncHandler(async (req, res, next) => {
  try {
    const admin_id = req.admin_id;
    if (!admin_id) {
      logger.warn("Missing admin_id on request");
      return next(new ApiError(401, "Unauthorized"));
    }

    logger.debug(`Fetching subevents for admin_id: ${admin_id}`);

    // 1) fetch subevent ids for this admin
    const subevents = await SubEvent.findAll({
      where: { admin_id },
      attributes: ["subevent_id"], // only need IDs here
    });

    const subeventIds = (subevents || []).map((s) =>
      s.toJSON ? s.toJSON().subevent_id : s.subevent_id
    );

    if (!subeventIds.length) {
      logger.info(`No subevents found for admin_id: ${admin_id}`);
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { attendees: [], by_subevent: {}, total_attendees: 0 },
            "No attendees found"
          )
        );
    }

    // 2) fetch join rows and include Attendee
    const joinRows = await SubEventAttendee.findAll({
      where: { subevent_id: subeventIds },
      attributes: ["subevent_attendee_id", "subevent_id", "created_at"], // join metadata kept if needed
      include: [
        {
          model: Attendee,
          as: "attendee", // must match association alias
          required: false,
          attributes: [
            "attendee_id",
            "name",
            "whatsapp",
            "email",
            "dob",
            "gender",
            "age",
            "created_at",
            "updated_at",
          ],
        },
      ],
      order: [["created_at", "ASC"]],
    });

    // 3) build deduped flat list + by_subevent with only ids + total
    const byId = new Map();
    const bySubevent = {}; // { subevent_id: { attendee_ids: [], total: n } }

    for (const jr of joinRows) {
      const joinObj = jr.toJSON ? jr.toJSON() : jr;
      const subevent_id = joinObj.subevent_id;
      const att = joinObj.attendee;
      if (!att || !att.attendee_id) continue;

      if (!byId.has(att.attendee_id)) {
        byId.set(att.attendee_id, {
          attendee_id: att.attendee_id,
          name: att.name,
          whatsapp: att.whatsapp,
          email: att.email,
          dob: att.dob,
          gender: att.gender,
          age: att.age,
          created_at: att.created_at,
          updated_at: att.updated_at,
        });
      }

      // group by subevent with only ids
      if (!bySubevent[subevent_id]) {
        bySubevent[subevent_id] = { attendee_ids: [], total: 0 };
      }
      // avoid duplicate attendee_id inside same subevent
      if (!bySubevent[subevent_id].attendee_ids.includes(att.attendee_id)) {
        bySubevent[subevent_id].attendee_ids.push(att.attendee_id);
        bySubevent[subevent_id].total =
          bySubevent[subevent_id].attendee_ids.length;
      }
    }

    const attendees = Array.from(byId.values());
    const total_attendees = attendees.length;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          attendees, // deduped full attendee objects
          by_subevent: bySubevent, // each subevent -> { attendee_ids: [...], total: N }
          total_attendees,
        },
        "Attendees fetched successfully"
      )
    );
  } catch (error) {
    logger.error(
      "Internal Server Error while fetching all attendees for admin",
      {
        message: error.message,
        stack: error.stack,
        sql: error?.sql || null,
      }
    );
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
  getAllOrdersForAdmin,
  getOrderDetails,
  getAllEventsAttendees,
  getAllAttendeesForAdmin,
};
