import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const Event = sequelize.define(
  "Event",
  {
    event_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      field: "event_id",
    },
    event_number: {
      type: DataTypes.INTEGER,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
      defaultValue: () => {
        return Math.floor(100000 + Math.random() * 900000);
      },
    },
    event_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 200],
      },
    },
    event_url: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 200],
      },
    },
    status: {
      type: DataTypes.ENUM(
        "Initiated",
        "Active",
        "Ready",
        "Closed",
        "Cancelled"
      ),
      allowNull: false,
      validate: {
        notEmpty: true,
        isIn: [["Initiated", "Active", "Ready", "Closed", "Cancelled"]],
      },
    },
    event_qr: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 200],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    venue: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [5, 500],
      },
    },
    google_map_link: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [5, 500],
      },
    },
    type_of_event: {
      type: DataTypes.ENUM(
        "conference",
        "workshop",
        "seminar",
        "concert",
        "exhibition",
        "sports",
        "festival",
        "other"
      ),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    number_of_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 365,
      },
    },
    date_start: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
        isAfter: new Date().toISOString().split("T")[0], // Must be today or future
      },
    },
    date_end: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
        isAfterStartDate(value) {
          if (value <= this.date_start) {
            throw new Error("End date must be after start date");
          }
        },
      },
    },
    admin_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "admins",
        key: "admin_id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    tableName: "events",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["admin_id"],
      },
      {
        fields: ["date_start"],
      },
      {
        fields: ["date_end"],
      },
      {
        fields: ["type_of_event"],
      },
      {
        fields: ["is_active"],
      },
      {
        fields: ["status"],
      },
    ],
    hooks: {
      beforeValidate: (event, options) => {
        // Calculate number of days automatically if not provided
        if (event.date_start && event.date_end && !event.number_of_days) {
          const start = new Date(event.date_start);
          const end = new Date(event.date_end);
          const timeDiff = end.getTime() - start.getTime();
          event.number_of_days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
        }
      },
    },
  }
);
export default Event;
