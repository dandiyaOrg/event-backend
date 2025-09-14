import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const Order = sequelize.define(
  "Order",
  {
    order_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      field: "order_id",
    },
    razorpay_order_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [10, 100],
      },
    },
    billing_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "billing_users",
        key: "billing_user_id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    admin_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "confirmed", "cancelled", "expired"),
      allowNull: false,
      defaultValue: "pending",
      validate: {
        isIn: [["pending", "confirmed", "cancelled", "expired"]],
      },
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
        isDecimal: true,
      },
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
    tableName: "orders",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["billing_user_id"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["razorpay_order_id"],
      },
      {
        fields: ["created_at"],
      },
    ],
  }
);

export default Order;
