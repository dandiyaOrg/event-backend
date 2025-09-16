import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const IssuedPass = sequelize.define(
  "IssuedPass",
  {
    issued_pass_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      field: "issued_pass_id",
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
    attendee_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "attendees",
        key: "attendee_id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    subevent_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "subevents",
        key: "subevent_id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    admin_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    transaction_id: {
      type: DataTypes.STRING(12),
      allowNull: false,
      references: {
        model: "transactions",
        key: "transaction_id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    is_expired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    issued_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true,
      },
    },
    expiry_date: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true,
        isAfterIssuedDate(value) {
          if (value && value <= this.issued_date) {
            throw new Error("Expiry date must be after issued date");
          }
        },
      },
    },
    booking_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM(
        "active",
        "expired",
        "cancelled",
        "used",
        "refunded"
      ),
      allowNull: false,
      defaultValue: "active",
      validate: {
        isIn: [["active", "used", "expired", "cancelled", "refunded"]],
      },
    },
    used_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    qr_image: {
      type: DataTypes.TEXT, // Store QR code image URL or base64
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    qr_data: {
      type: DataTypes.TEXT, // Store QR code data for verification
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    sponsored_pass: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    order_item_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "order_items",
        key: "order_item_id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
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
    tableName: "issued_passes",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    dialectOptions: {
      useIdentity: true,
    },
    indexes: [
      {
        fields: ["attendee_id"],
      },
      {
        fields: ["subevent_id"],
      },
      {
        fields: ["booking_number"],
        unique: true,
      },
      {
        fields: ["status"],
      },
      {
        fields: ["is_expired"],
      },
      {
        fields: ["expiry_date"],
      },
      {
        fields: ["order_item_id"],
      },
    ],
    hooks: {
      beforeValidate: (issuedPass, options) => {
        if (issuedPass.sponsored_pass) {
          issuedPass.order_item_id = null;
        } else if (!issuedPass.order_item_id) {
          throw new Error("Non-sponsored pass requires order_item_id");
        }
      },
      beforeCreate: async (issuedPass, options) => {
        if (!issuedPass.booking_number) {
          // Get the next booking number
          const lastPass = await IssuedPass.findOne({
            order: [["booking_number", "DESC"]],
            attributes: ["booking_number"],
          });

          const nextBookingNumber = lastPass
            ? lastPass.booking_number + 1
            : 1000;
          issuedPass.booking_number = nextBookingNumber;
        }
      },
      beforeUpdate: (issuedPass, options) => {
        // Auto-expire if expiry date is passed
        if (
          issuedPass.expiry_date &&
          new Date() > new Date(issuedPass.expiry_date)
        ) {
          issuedPass.is_expired = true;
          if (issuedPass.status === "active") {
            issuedPass.status = "expired";
          }
        }
      },
    },
  }
);

export default IssuedPass;
