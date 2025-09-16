import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const BillingUser = sequelize.define(
  "BillingUser",
  {
    billing_user_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      field: "billing_user_id",
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
        isAlpha: {
          msg: "Name should contain only letters and spaces",
        },
      },
    },
    mobile_no: {
      type: DataTypes.STRING(15),
      allowNull: false,
      validate: {
        isNumeric: true,
        len: [10, 15],
      },
    },
    whatsapp: {
      type: DataTypes.STRING(15),
      allowNull: true,
      validate: {
        isNumeric: true,
        len: [10, 15],
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    dob: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      validate: {
        isDate: true,
        isBefore: new Date().toISOString().split("T")[0], // Must be in the past
        isValidAge(value) {
          if (value) {
            const today = new Date();
            const birthDate = new Date(value);
            const age = today.getFullYear() - birthDate.getFullYear();

            if (age > 120 || age < 0) {
              throw new Error("Invalid date of birth");
            }
          }
        },
      },
    },
    age: {
      type: DataTypes.VIRTUAL, // Calculated field
      get() {
        const dob = this.getDataValue("dob");
        if (!dob) return null;

        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          age--;
        }

        return age;
      },
    },
    gender: {
      type: DataTypes.ENUM("Male", "Female", "Other"),
      allowNull: false,
      validate: {
        notEmpty: true,
        isIn: [["Male", "Female", "Other"]],
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
    tableName: "billing_users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["mobile_no", "email"],
      },
      {
        fields: ["email"],
      },
      {
        fields: ["mobile_no"],
      },
      {
        fields: ["gender"],
      },
    ],
    hooks: {
      beforeValidate: (user, options) => {
        // Normalize email to lowercase
        if (user.email) {
          user.email = user.email.toLowerCase().trim();
        }

        // Normalize name
        if (user.name) {
          user.name = user.name.trim().replace(/\s+/g, " ");
        }
      },
    },
  }
);

export default BillingUser;
