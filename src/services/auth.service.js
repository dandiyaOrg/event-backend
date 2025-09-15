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

export { isPasswordCorrect, generateAccessToken, generateRefreshToken };
