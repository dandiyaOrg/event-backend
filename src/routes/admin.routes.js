import { Router } from "express";
import {
  forgetPassword,
  loginWithEmail,
  refreshAccessToken,
  registerAdmin,
  verifyOTPForLogin,
  verifyOTPForPasswordReset,
  getAdminDetails,
  getAllBillingUserForEvent,
  getBillingUsersForAdmin,
  getTransactionsForAdmin,
  getAllOrdersForAdmin,
  getOrderDetails,
  getAllEventsAttendees,
  getAllAttendeesForAdmin,
} from "../controllers/admin.controller.js";

import validateBody from "../middlewares/validateBody.middleware.js";
import {
  adminRegisterSchema,
  otpCheckSchema,
  updatePasswordSchema,
} from "../utils/schemaValidation.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/").get(verifyJWT, getAdminDetails);

router.route("/login").post(loginWithEmail);

router.route("/login/refresh").post(refreshAccessToken);

router
  .route("/login/verifyotp")
  .post(validateBody(otpCheckSchema), verifyOTPForLogin);

router
  .route("/forgetPassword")
  .post(validateBody(updatePasswordSchema), forgetPassword);

router
  .route("/forgetPassword/verifyotp")
  .post(validateBody(otpCheckSchema), verifyOTPForPasswordReset);

router
  .route("/register")
  .post(validateBody(adminRegisterSchema), registerAdmin);

router.route("/billingUsers").get(verifyJWT, getBillingUsersForAdmin);
router
  .route("/event/billingUsers/:eventId")
  .get(verifyJWT, getAllBillingUserForEvent);

router.route("/transactions").get(verifyJWT, getTransactionsForAdmin);
router.route("/events/attendees").get(verifyJWT, getAllEventsAttendees);
router.route("/orders").get(verifyJWT, getAllOrdersForAdmin);
router.route("/order/detail/:orderId").get(verifyJWT, getOrderDetails);
router.route("/attendees").get(verifyJWT, getAllAttendeesForAdmin);

export default router;
