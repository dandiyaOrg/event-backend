import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";
import jwt from "jsonwebtoken";
import { decryptPassword, encryptPassword } from "../../utils/encrypt.js";

const Employee = sequelize.define(
  "Employee",
  {
    employee_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      field: "employee_id",
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    mobile_no: {
      type: DataTypes.STRING(15),
      allowNull: false,
      unique: true,
      validate: {
        isNumeric: true,
        len: [10, 15],
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
        isAlphanumeric: true,
      },
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
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
    tableName: "employees",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["email"],
      },
      {
        fields: ["username"],
      },
      {
        fields: ["admin_id"],
      },
      {
        fields: ["is_active"],
      },
    ],
    hooks: {
      beforeCreate: async (employee, options) => {
        if (employee.password) {
          employee.password = encryptPassword(employee.password);
        }
      },

      beforeUpdate: async (employee, options) => {
        if (employee.changed("password")) {
          employee.password = encryptPassword(employee.password);
        }
      },
    },
  }
);

Employee.prototype.isPasswordCorrect = async function (password) {
  if (!this.password) return false;
  const decrypted = decryptPassword(this.password);
  return decrypted === password;
};

Employee.prototype.generateAccessToken = function () {
  return jwt.sign(
    {
      employee_id: this.employee_id,
      email: this.email,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

Employee.prototype.generateRefreshToken = function () {
  const token = jwt.sign(
    { employee_id: this.employee_id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
  this.refreshToken = token;
  return token;
};
export default Employee;
