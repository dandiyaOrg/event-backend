import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const EventBillingUsers = sequelize.define(
  "EventBillingUsers",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    billing_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "billing_users",
        key: "billing_user_id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    event_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "events",
        key: "event_id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "orders",
        key: "order_id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
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
    tableName: "event_billing_users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["billing_user_id", "event_id", "order_id"],
      },
    ],
  }
);

export default EventBillingUsers;
