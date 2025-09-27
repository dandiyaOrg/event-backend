import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Order, Transaction, sequelize } from "../db/models/index.js";
import { logger } from "../app.js";
import {
  getOrderStatus,
  validateCallback,
} from "../services/payment.service.js";

const phonePayCallBackFunction = asyncHandler(async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    logger.info("PhonePe callback received", {
      headers: req.headers,
      bodyLength: req.body?.length,
    });
    const validation = await validateCallback(req.headers, req.body);
    logger.info("PhonePe callback validated", { type: validation.type });

    // payload may contain originalMerchantOrderId / orderId / merchantOrderId
    const payload = validation.payload || {};
    const merchantOrderId =
      payload.originalMerchantOrderId ||
      payload.orderId ||
      payload.merchantOrderId;
    if (!merchantOrderId) {
      logger.warn("Callback missing merchantOrderId", { payload });
      await t.rollback();
      return res.status(400).send("missing merchantOrderId");
    }

    const existingTransaction = await Transaction.findOne({
      where: { merchant_order_id: merchantOrderId },
      transaction: t,
    });
    if (!existingTransaction) {
      logger.warn("Transaction not found", { merchantOrderId });
      await t.rollback();
      return res.status(404).json({ error: "Transaction not found" });
    }
    const statusResp = await getOrderStatus(merchantOrderId);
    logger.info("PhonePe getOrderStatus response", {
      merchantOrderId,
      statusResp: JSON.stringify(statusResp),
    });

    const gatewayState = (statusResp?.data?.state || statusResp?.state || "")
      .toString()
      .toLowerCase();

    let txnStatus = "pending";
    let orderStatus = null;

    switch (gatewayState) {
      case "completed":
      case "success":
        txnStatus = "success";
        orderStatus = "confirmed";
        break;
      case "failed":
      case "cancelled":
      case "timeout":
        txnStatus = "failure";
        orderStatus = "cancelled";
        break;
      case "pending":
      case "in_progress":
        txnStatus = "pending";
        orderStatus = null;
        break;
      default:
        logger.warn("Unknown gateway state", { gatewayState, merchantOrderId });
        txnStatus = "pending";
    }

    // Update transaction
    await Transaction.update(
      {
        status: txnStatus,
        gateway_response: statusResp,
        merchant_payment_id:
          statusResp?.data?.paymentId ||
          statusResp?.data?.transactionId ||
          statusResp?.data?.orderId ||
          null,
        callback_received_at: new Date(),
        updated_at: new Date(),
      },
      {
        where: { merchant_order_id: merchantOrderId },
        transaction: t,
      }
    );

    // Update Order status if we have a final status
    if (orderStatus) {
      const orderUpdateResult = await Order.update(
        {
          status: orderStatus,
          updated_at: new Date(),
        },
        {
          where: { merchant_order_id: merchantOrderId },
          transaction: t,
        }
      );

      if (orderUpdateResult[0] === 0) {
        logger.warn("No order found to update", { merchantOrderId });
      } else {
        logger.info("Order status updated", { merchantOrderId, orderStatus });
      }
    }

    await t.commit();

    // Send success response to PhonePe
    logger.info("PhonePe callback processed successfully", {
      merchantOrderId,
      txnStatus,
      orderStatus,
    });

    return res.status(200).json({
      status: "received",
      merchantOrderId,
      processed: true,
    });
  } catch (err) {
    await t.rollback();
    logger.error("PhonePe callback processing failed", {
      error: err.message,
      stack: err.stack,
      merchantOrderId: req.body ? "check payload" : "no body",
    });

    // Still return 200 to PhonePe to avoid retries for permanent failures
    return res.status(200).json({
      status: "error",
      message: "Processing failed but acknowledged",
    });
  }
});

const paymentStatus = asyncHandler(async (req, res, next) => {
  try {
    const { transactionId } = req.query;

    if (!transactionId || transactionId.trim() === "") {
      return next(new ApiError(400, " transactionId is required"));
    }

    const transaction = await Transaction.findByPk(transactionId);

    if (!transaction) {
      return next(new ApiError(404, "Transaction not found"));
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          transactionId: transaction.transaction_id,
          status: transaction.status,
          orderId: transaction.order_id,
          amount: transaction.amount,
          method: transaction.method_of_payment,
          merchantOrderId: transaction.merchant_order_id,
          merchantPaymentId: transaction.merchant_payment_id,
        },
        "Transaction fetched successfully"
      )
    );
  } catch (err) {
    return next(new ApiError(500, "Server Error", err));
  }
});

export { phonePayCallBackFunction, paymentStatus };
