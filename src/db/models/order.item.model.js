import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const OrderItem = sequelize.define(
  "OrderItem",
  {
    order_item_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      field: "order_item_id",
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "orders",
        key: "order_id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    pass_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "passes",
        key: "pass_id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
      },
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    total_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
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
    tableName: "order_items",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["order_id"],
      },
      {
        fields: ["pass_id"],
      },
    ],
    hooks: {
      beforeSave: (orderItem) => {
        // Automatically calculate total_price if not provided
        if (orderItem.unit_price && orderItem.quantity) {
          orderItem.total_price = orderItem.unit_price * orderItem.quantity;
        }
      },
    },
  }
);

export default OrderItem;
