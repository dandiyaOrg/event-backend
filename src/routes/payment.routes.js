import { Router } from "express";
import {
  paymentStatus,
  phonePayCallBackFunction,
} from "../controllers/payment.controller.js";
import express from "express";
const router = Router();

router.route("/status").get(paymentStatus);

router
  .route("/phonepe/callback")
  .post(express.raw({ type: "application/json" }), phonePayCallBackFunction);

export default router;
