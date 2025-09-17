import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const SubEvent = sequelize.define(
  "SubEvent",
  {
    subevent_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      field: "subevent_id",
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 200],
      },
    },
    admin_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
      },
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false,
      validate: {
        notEmpty: true,
        isAfterStartTime(value) {
          if (value <= this.start_time) {
            throw new Error("End time must be after start time");
          }
        },
      },
    },
    day: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 365,
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 10000,
      },
    },
    available_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        isLessThanOrEqualToQuantity(value) {
          if (value > this.quantity) {
            throw new Error("Available quantity cannot exceed total quantity");
          }
        },
      },
    },
    images: {
      type: DataTypes.JSON, // Store array of image URLs (max 3)
      allowNull: true,
      validate: {
        isValidImageArray(value) {
          if (value && Array.isArray(value)) {
            if (value.length > 3) {
              throw new Error("Maximum 3 images allowed");
            }
            value.forEach((url) => {
              if (typeof url !== "string" || url.length === 0) {
                throw new Error("Invalid image URL");
              }
            });
          }
        },
      },
    },
    event_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "events",
        key: "event_id",
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
    tableName: "subevents",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["name", "event_id"],
        unique: true,
      },
      {
        fields: ["event_id"],
      },
      {
        fields: ["date"],
      },
      {
        fields: ["day"],
      },
      {
        fields: ["is_active"],
      },
      {
        fields: ["event_id", "day"],
      },
    ],
    hooks: {
      beforeCreate: (pass, options) => {
        if (pass.available_quantity === undefined) {
          pass.available_quantity = pass.quantity;
        }
      },
      beforeValidate: (subEvent, options) => {
        if (subEvent.images && Array.isArray(subEvent.images)) {
          subEvent.images = subEvent.images.slice(0, 3);
        }
      },
    },
  }
);

export default SubEvent;
