import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const Transaction = sequelize.define(
  "Transaction",
  {
    transaction_id: {
      type: DataTypes.STRING(12),
      primaryKey: true,
      allowNull: false,
      unique: true,
      defaultValue: () => {
        // Generate a 12-digit random number
        return Math.floor(Math.random() * 900000000000) + 100000000000;
      },
      field: "transaction_id",
    },
    admin_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
        isDecimal: true,
      },
    },
    datetime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true,
      },
    },
    source_of_payment: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "success",
        "failure",
        "refund",
        "partial_refund"
      ),
      allowNull: false,
      defaultValue: "pending",
      validate: {
        isIn: [["pending", "success", "failure", "refund", "partial_refund"]],
      },
    },
    method_of_payment: {
      type: DataTypes.ENUM(
        "card",
        "netbanking",
        "upi",
        "wallet",
        "emi",
        "cash",
        "other"
      ),
      allowNull: true,
      validate: {
        isIn: [["card", "netbanking", "upi", "wallet", "emi", "cash", "other"]],
      },
    },
    razorpay_order_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [0, 100],
      },
    },
    razorpay_payment_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [0, 100],
      },
    },
    razorpay_signature: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true, // Add this line
      references: {
        model: "orders",
        key: "order_id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT", // Don't delete order if transactions exist
    },
    gateway_response: {
      type: DataTypes.JSON, // Store complete gateway response
      allowNull: true,
    },
    refund_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0,
      validate: {
        min: 0,
        isDecimal: true,
        isNotMoreThanAmount(value) {
          if (value && value > this.amount) {
            throw new Error("Refund amount cannot exceed transaction amount");
          }
        },
      },
    },
    refund_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    tableName: "transactions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["status"],
      },
      {
        fields: ["order_id"],
      },
      {
        fields: ["razorpay_payment_id"],
      },
      {
        fields: ["datetime"],
      },
      {
        fields: ["amount"],
      },
    ],
    hooks: {
      beforeValidate: (transaction, options) => {
        // Ensure refund amount is within limits
        if (transaction.refund_amount && transaction.refund_amount < 0) {
          transaction.refund_amount = 0;
        }
      },
    },
  }
);

export default Transaction;
