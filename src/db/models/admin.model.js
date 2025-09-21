import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const Admin = sequelize.define(
  "Admin",
  {
    admin_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      field: "admin_id",
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
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [6, 255],
      },
    },
    organization: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    email_otp: {
      type: DataTypes.STRING(6),
      allowNull: true,
    },
    email_otp_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: "admins",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["email"],
      },
      {
        fields: ["mobile_no"],
      },
    ],
    hooks: {
      beforeCreate: async (admin, options) => {
        const hash = await bcrypt.hash(admin.getDataValue("password"), 10);
        admin.setDataValue("password", hash);
      },

      beforeUpdate: async (admin, options) => {
        if (admin.changed("password")) {
          const hash = await bcrypt.hash(admin.getDataValue("password"), 10);
          admin.setDataValue("password", hash);
        }
      },
    },
  }
);

Admin.prototype.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

Admin.prototype.generateAccessToken = function () {
  return jwt.sign(
    {
      admin_id: this.admin_id,
      email: this.email,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

Admin.prototype.generateRefreshToken = async function () {
  const token = jwt.sign(
    { admin_id: this.admin_id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
  this.refreshToken = token;
  await this.save();
  return token;
};

Admin.prototype.generateEmailOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5);

  this.email_otp = otp;
  this.email_otp_expires_at = expiresAt;

  return otp;
};

Admin.prototype.verifyEmailOTP = function (providedOtp) {
  if (!this.email_otp || !this.email_otp_expires_at) {
    return { success: false, message: "No OTP generated" };
  }

  if (new Date() > this.email_otp_expires_at) {
    return { success: false, message: "OTP has expired" };
  }

  if (this.email_otp === providedOtp) {
    return { success: true, message: "OTP verified successfully" };
  }

  return { success: false, message: "Invalid OTP" };
};

Admin.prototype.clearEmailOTP = function () {
  this.email_otp = null;
  this.email_otp_expires_at = null;
  return this.save();
};

Admin.prototype.complete2FAVerification = async function (providedOtp) {
  const verification = this.verifyEmailOTP(providedOtp);

  if (verification.success) {
    await this.clearEmailOTP();
    return { success: true, message: "2FA verification completed" };
  }

  return verification;
};

export default Admin;
