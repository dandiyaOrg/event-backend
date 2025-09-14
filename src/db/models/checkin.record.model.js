import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const CheckingRecord = sequelize.define(
  "CheckingRecord",
  {
    checkin_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      field: "checkin_id",
    },
    issued_pass_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "issued_passes",
        key: "issued_pass_id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    checkin_time: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true,
      },
    },
    employee_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "employees",
        key: "employee_id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    checkin_method: {
      type: DataTypes.ENUM(
        "qr_scan",
        "manual_entry",
        "mobile_app",
        "web_portal"
      ),
      allowNull: false,
      defaultValue: "qr_scan",
      validate: {
        isIn: [["qr_scan", "manual_entry", "mobile_app", "web_portal"]],
      },
    },
    checked_in_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "employees",
        key: "employee_id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
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
    tableName: "checking_records",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["employee_id"],
      },
      {
        fields: ["checkin_time"],
      },
    ],
  }
);

export default CheckingRecord;
