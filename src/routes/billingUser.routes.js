import { Router } from "express";
import {
  createBillingUser,
  createOrderForBillingUser,
  createGlobalPassOrderForBillingUser,
  issueGlobalPassToAttendees,
  issuePassToAttendees,
} from "../controllers/billingUser.controller.js";
import validateBody from "../middlewares/validateBody.middleware.js";
import {
  createBillingUserSchema,
  createOrderSchema,
  createGlobalPassOrderSchema,
} from "../utils/schemaValidation.js";

const router = Router();

router
  .route("/create")
  .post(validateBody(createBillingUserSchema), createBillingUser);

router
  .route("/order/create")
  .post(validateBody(createOrderSchema), createOrderForBillingUser);
router
  .route("/order/global/create")
  .post(
    validateBody(createGlobalPassOrderSchema),
    createGlobalPassOrderForBillingUser
  );

router.route("/issue-passes").post(issuePassToAttendees);
router.route("/issue-global-passes").post(issueGlobalPassToAttendees);

export default router;
