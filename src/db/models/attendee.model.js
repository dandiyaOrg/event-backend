import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const Attendee = sequelize.define(
  "Attendee",
  {
    attendee_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      field: "attendee_id",
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    whatsapp: {
      type: DataTypes.STRING(15),
      allowNull: false,
      validate: {
        isNumeric: true,
        len: [10, 15],
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
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
    gender: {
      type: DataTypes.ENUM("Male", "Female", "Other"),
      allowNull: false,
      validate: {
        notEmpty: true,
        isIn: [["Male", "Female", "Other"]],
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
    tableName: "attendees",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["email"],
      },
      {
        fields: ["whatsapp"],
      },
      {
        fields: ["gender"],
      },
    ],
    hooks: {
      beforeValidate: (attendee, options) => {
        // Normalize email to lowercase
        if (attendee.email) {
          attendee.email = attendee.email.toLowerCase().trim();
        }

        // Normalize name
        if (attendee.name) {
          attendee.name = attendee.name.trim().replace(/\s+/g, " ");
        }
      },
    },
  }
);

export default Attendee;
