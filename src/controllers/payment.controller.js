import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Order, Transaction } from "../db/models/index.js";
import { logger } from "../app.js";
import {
  getOrderStatus,
  validateCallback,
} from "../services/payment.service.js";

const phonePayCallBackFunction = asyncHandler(async (req, res, next) => {
  try {
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
      return res.status(400).send("missing merchantOrderId");
    }

    // Confirm with PhonePe status API
    const statusResp = await getOrderStatus(merchantOrderId);
    logger.info("PhonePe getOrderStatus", { merchantOrderId, statusResp });

    // Map gateway state -> your DB states
    // adapt these checks to the real structure of statusResp (inspect statusResp.data.state etc.)
    const gatewayState = (statusResp?.data?.state || statusResp?.state || "")
      .toString()
      .toLowerCase();
    let txnStatus = "pending"; // default
    let orderStatus = null;

    if (gatewayState === "completed" || gatewayState === "success") {
      txnStatus = "success";
      orderStatus = "confirmed";
    } else if (gatewayState === "failed" || gatewayState === "cancelled") {
      txnStatus = "failure";
      orderStatus = "cancelled";
    } else {
      txnStatus = "pending";
      orderStatus = null;
    }

    await Transaction.update(
      {
        status: txnStatus,
        gateway_response: statusResp,
        merchant_payment_id:
          statusResp?.data?.paymentId || statusResp?.data?.orderId || null,
        callback_received_at: new Date(),
      },
      {
        where: { merchant_order_id: merchantOrderId },
      }
    );

    // Update Order status if we have a final mapping
    if (orderStatus) {
      await Order.update(
        { status: orderStatus },
        { where: { merchant_order_id: merchantOrderId } }
      );
    }

    return res.status(200).send("received");
  } catch (err) {
    logger.error("phonepe callback error", { error: err });
    return res.status(500).send("server error");
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
          ransactionId: transaction.transaction_id,
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
