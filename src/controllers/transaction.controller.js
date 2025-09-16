import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Op } from "sequelize";
import Transaction from "../db/models/transaction.model.js";

const GetTransactionDataBySearch = asyncHandler(async (req, res, next) => {
  try {
    const inputtext = (req.query.inputtext || "").toLowerCase();
    const page = parseInt(req.query.page) || 1;
    const limit = 25;
    const offset = (page - 1) * limit;

    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where: {
        [Op.or]: [
          { source_of_payment: { [Op.like]: `%${inputtext}%` } },
          { method_of_payment: { [Op.like]: `%${inputtext}%` } },
          { transaction_id: { [Op.like]: `%${inputtext}%` } },
        ],
      },
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });

    const transactionList = transactions.map((t) => ({
      transaction_id: t.transaction_id,
      admin_id:t.admin_id,
      source_of_payment: t.source_of_payment,
      method_of_payment: t.method_of_payment,
      amount: t.amount,
      status: t.status,
      datetime:t.datetime,
      razorpay_order_id:t.razorpay_order_id,
      razorpay_payment_id:t.razorpay_payment_id,
      order_id:t.order_id,
      refund_amount:t.refund_amount,
      refund_reason:t.refund_reason,
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
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

export {GetTransactionDataBySearch};
