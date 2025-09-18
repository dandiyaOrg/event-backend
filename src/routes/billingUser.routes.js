import { Router } from "express";
import {
  createBillingUser,
  createOrderForBillingUser,
} from "../controllers/billingUser.controller.js";
import validateBody from "../middlewares/validateBody.middleware.js";
import {
  createBillingUserSchema,
  createOrderSchema,
} from "../utils/schemaValidation.js";

const router = Router();

router
  .route("/create")
  .post(validateBody(createBillingUserSchema), createBillingUser);

router
  .route("/order/create")
  .post(validateBody(createOrderSchema), createOrderForBillingUser);
