import { Router } from "express";
import {
  paymentStatus,
  phonePayCallBackFunction,
} from "../controllers/payment.controller.js";

const router = Router();

router.route("/status").get(paymentStatus);

router.route("/phonepe/callback").post(phonePayCallBackFunction);

export default router;
