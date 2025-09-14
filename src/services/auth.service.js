import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";

// Verify password
async function isPasswordCorrect(user, password) {
  return await bcrypt.compare(password, user.password);
}

// Generate access token
async function generateAccessToken(user) {
  return await jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
}

// Generate refresh token
async function generateRefreshToken(user) {
  return await jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
}
const algorithm = "aes-256-cbc";
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

const encryptPassword = (text) => {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
};

const decryptPassword = (encryptedText) => {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

export {
  isPasswordCorrect,
  generateAccessToken,
  generateRefreshToken,
  encryptPassword,
  decryptPassword,
};
