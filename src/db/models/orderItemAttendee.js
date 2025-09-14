import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const OrderItemAttendee = sequelize.define(
  "OrderItemAttendee",
  {
    order_item_attendee_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      field: "order_item_attendee_id",
    },
    order_item_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "order_items",
        key: "order_item_id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    attendee_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "attendees",
        key: "attendee_id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    assigned_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
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
    tableName: "order_item_attendees",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["order_item_id"],
      },
      {
        fields: ["attendee_id"],
      },
      {
        unique: true,
        fields: ["order_item_id", "attendee_id"],
        name: "unique_order_item_attendee",
      },
    ],
  }
);

export default OrderItemAttendee;
