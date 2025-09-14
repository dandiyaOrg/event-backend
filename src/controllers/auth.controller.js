import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import bcrypt from "bcrypt";
import {
  isPasswordCorrect,
  generateAccessToken,
  generateRefreshToken,
} from "../services/auth.service.js";
import sendEmail from "../services/mail.service.js";
import prisma from "../db/config.js";
import crypto from "crypto";
const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "None",
};

const generateVerificationToken = async (email, password) => {
  const payload = { email, password };
  return await jwt.sign(payload, process.env.EMAIL_VERIFICATION_SECRET, {
    expiresIn: process.env.EMAIL_VERIFICATION_EXPIRY,
  });
};
const registerWithEmail = asyncHandler(async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!(email && password))
      return next(new ApiError(400, "email and password are required"));
    const existeduser = await prisma.admin.findUnique({ where: { email } });
    if (existeduser)
      return next(new ApiError(409, "User already exist with the same email"));
    const verificationToken = await generateVerificationToken(email, password);
    const verfiyurl = `https://anginat-event-backend.onrender.com/api/v1/auth/verify/${verificationToken}`;
    const message = `You are receiving this email for verifying email address. Please click of the following link, or paste this into your browser to complete the verfication process within one hour of receiving it:\n\n${verfiyurl}`;
    await sendEmail({
      email: email,
      subject: "Verify Email",
      message,
    });
    return res
      .status(200)
      .json(
        new ApiResponse(200, {}, "Verification link has been sent to email")
      );
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});
const verifyEmail = asyncHandler(async (req, res, next) => {
  try {
    const { token } = req.params;
    let decodedtoken;
    try {
      decodedtoken = await jwt.verify(
        token,
        process.env.EMAIL_VERIFICATION_SECRET
      );
    } catch (err) {
      return next(new ApiError(400, "Token Expired Or Invalid", err));
    }

    return res.redirect(
      `https://event-frontend-omega.vercel.app/signup1?token=${encodeURIComponent(token)}`
    );
  } catch (err) {
    return next(new ApiError(500, "Internal Server Error", err));
  }
});
const fullRegisteration = asyncHandler(async (req, res, next) => {
  console.log(req.body);
  try {
    const { userId, token, companyName, phoneNo } = req.body;
    if (!companyName || !phoneNo)
      return next(
        new ApiError(400, "Company name and Phone Number is required")
      );
    if (!token && !userId) {
      return next(new ApiError(400, "Token or UserId is required"));
    }
    if (userId) {
      const myuser = await prisma.admin.findUnique({
        where: { id: parseInt(userId) },
      });
      if (!myuser) return next(new ApiError(404, "User not found"));

      if (myuser.companyName !== null && myuser.phoneNo !== null)
        return next(
          new ApiError(400, "User already, Registered Please login directly")
        );
      const existinguser = await prisma.admin.findFirst({
        where: { phoneNo },
      });

      if (existinguser)
        return next(new ApiError(409, "Phone no already in use"));
      const accessToken = await generateAccessToken(myuser);
      const refreshToken = await generateRefreshToken(myuser);
      if (!(accessToken && refreshToken))
        return next(new ApiError(500, "Error generating tokens"));
      const user = await prisma.admin.update({
        where: { id: parseInt(userId) },
        data: {
          companyName,
          phoneNo,
          refreshToken,
        },
      });

      if (!user) return next(new ApiError(500, "Error updating user"));
      res.setHeader("accessToken", accessToken);
      res.setHeader("refreshToken", refreshToken);
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { user, accessToken },
            "User Full registration completed successfully"
          )
        );
    }
    if (token) {
      let decodedtoken;
      try {
        decodedtoken = jwt.verify(token, process.env.EMAIL_VERIFICATION_SECRET);
      } catch (err) {
        return next(new ApiError(400, "Token expired or invalid"));
      }
      const { email, password } = decodedtoken;
      const existeduser = await prisma.admin.findUnique({
        where: { email },
      });
      if (existeduser)
        return next(
          new ApiError(
            409,
            "User already exists with same email login directly "
          )
        );
      const existinguser = await prisma.admin.findFirst({
        where: { phoneNo },
      });
      if (existinguser)
        return next(new ApiError(409, "Phone no already in use"));
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.admin.create({
        data: {
          email,
          password: hashedPassword,
          companyName,
          phoneNo,
        },
      });
      if (!user) return next(new ApiError(500, "Error creating user"));
      const accessToken = await generateAccessToken(user);
      const refreshToken = await generateRefreshToken(user);
      if (!(accessToken && refreshToken))
        return next(new ApiError(500, "Error generating tokens"));
      const updatedUser = await prisma.admin.update({
        where: { id: parseInt(user.id) },
        data: { refreshToken },
      });
      res.setHeader("accessToken", accessToken);
      res.setHeader("refreshToken", refreshToken);
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { user: updatedUser, accessToken },
            "User Full registration completed successfully"
          )
        );
    }
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const loginWithEmail = asyncHandler(async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!(email && password))
      return next(new ApiError(400, "Email and password fields are required"));
    const myuser = await prisma.admin.findUnique({ where: { email } });
    if (!myuser)
      return next(new ApiError(404, "User not found, please register first"));
    if (!myuser.password) return next(new ApiError(401, "Invalid Password"));
    const isMatch = await isPasswordCorrect(myuser, password);
    if (!isMatch) return next(new ApiError(400, "Incorrect credentials"));
    if (!myuser.companyName || !myuser.phoneNo) {
      return res
        .status(202)
        .json(
          new ApiResponse(
            202,
            { userId: myuser.id, email },
            "Additional Info is required"
          )
        );
    }
    const accessToken = await generateAccessToken(myuser);
    const refreshToken = await generateRefreshToken(myuser);
    if (!(accessToken && refreshToken))
      return next(new ApiError(500, "Error generating tokens"));
    const user = await prisma.admin.update({
      where: { id: myuser.id },
      data: { refreshToken },
    });
    res.setHeader("accessToken", accessToken);
    res.setHeader("refreshToken", refreshToken);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { user, accessToken },
          "User logged in successfully"
        )
      );
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const refreshAccessToken = asyncHandler(async (req, res, next) => {
  try {
    const { refreshToken } =
      req.cookies || req.header("refreshToken") || req.body;
    if (!refreshToken)
      return next(new ApiError(400, "Refresh Token is required"));
    let decodedtoken;
    try {
      decodedtoken = await jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
    } catch (err) {
      return next(new ApiError(401, "Token Expired Or Invalid", err));
    }

    const myuser = await prisma.admin.findUnique({
      where: { id: decodedtoken.id },
    });
    if (!myuser) return next(new ApiError(404, "User doesn't exist"));
    if (refreshToken != myuser.refreshToken)
      return next(new ApiError(401, "Refresh Token not matched"));
    const accessToken = await generateAccessToken(myuser);
    if (!accessToken)
      return next(new ApiError(500, "Error generating access token"));
    res.setHeader("accessToken", accessToken);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { user: myuser, accessToken },
          "Access Token refreshed successfully"
        )
      );
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const forgetPassword = asyncHandler(async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(new ApiError(400, "Email is required"));
    const myuser = await prisma.admin.findUnique({ where: { email } });
    if (!myuser) return next(new ApiError(404, "User not Found"));
    const token = crypto.randomBytes(20).toString("hex");
    const expiry = Date.now() + 3600000;
    await prisma.admin.update({
      where: { email },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: new Date(expiry),
      },
    });
    const resetUrl = `https://anginat-event-backend.onrender.com/api/v1/auth/reset-password/${token}`;
    const message = `You are receiving this email because you (or someone else) have requested the reset of a password. Please click on the following link, or paste this into your browser to complete the process within one hour of receiving it:\n\n${resetUrl}`;
    await sendEmail({
      email: email,
      subject: "Password Reset",
      message,
    });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Email sent for password Reset"));
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const verifyResetToken = asyncHandler(async (req, res, next) => {
  try {
    const { token } = req.params;
    const myuser = await prisma.admin.findFirst({
      where: {
        resetPasswordToken: token,
      },
    });

    if (!myuser) return next(new ApiError(400, "Invalid Reset Password token"));
    if (myuser.resetPasswordExpires < new Date()) {
      return next(new ApiError(400, "Password Teset Token has been expired"));
    }

    return res.redirect(
      `https://event-frontend-omega.vercel.app/resetpassword?token=${encodeURIComponent(token)}`
    );
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const checkTokenValidity = asyncHandler(async (req, res, next) => {
  try {
    console.log(`My refresh token is : ${req.header("refreshToken")}`);
    let user;
    const accessToken =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    const refreshToken =
      req.cookies?.refreshToken || req.header("refreshToken");
    if (!(accessToken || refreshToken))
      return next(new ApiError(401, "Unauthorized request"));
    let decodedAccessToken, decodedRefreshToken;
    try {
      decodedAccessToken = jwt.verify(
        accessToken,
        process.env.ACCESS_TOKEN_SECRET
      );
    } catch (err) {
      console.log("Access token verification failed");
    }
    if (!decodedAccessToken) {
      try {
        decodedRefreshToken = jwt.verify(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET
        );
      } catch (err) {
        return next(
          new ApiError(401, "Tokens are expired; please log in again")
        );
      }
      if (decodedRefreshToken) {
        user = await prisma.admin.findUnique({
          where: { id: decodedRefreshToken.id },
        });
        if (!user) return next(new ApiError(401, "Invalid refresh Token"));
        const newAccessToken = await generateAccessToken(user);
        res.setHeader("accessToken", newAccessToken);
        res.setHeader("refreshToken", refreshToken);
        return res
          .status(201)
          .json(new ApiResponse(201, user, "User verified successfully"));
      } else {
        return next(new ApiError(401, "Invalid refresh token"));
      }
    }
    user = await prisma.admin.findUnique({
      where: { id: decodedAccessToken?.id },
    });
    if (!user) return next(new ApiError(401, "Invalid access token"));
    res.setHeader("accessToken", accessToken);
    res.setHeader("refreshToken", refreshToken);
    return res
      .status(201)
      .json(new ApiResponse(201, user, "User Verified Successfully"));
  } catch (err) {
    return next(new ApiError(500, "Internal Server Error", err));
  }
});
const changePassword = asyncHandler(async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return next(new ApiError(400, "Password field is required"));
    const { token } = req.params;
    if (!token) return next(new ApiError(400, "Token is required"));

    const myuser = await prisma.admin.findFirst({
      where: {
        resetPasswordToken: token,
      },
    });
    if (!myuser)
      return next(new ApiError(400, "Invalid or expired password reset token"));
    if (myuser.resetPasswordExpires < new Date()) {
      return next(new ApiError(400, "Password Teset Token has been expired"));
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const updateduser = await prisma.admin.update({
      where: { id: myuser.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });
    if (!updateduser) return next(new ApiError(500, "Cannot update password"));
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password Reset successfully"));
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});
const googleCheck = asyncHandler(async (req, res) => {
  try {
    const user = req.user;
    console.log(`my another user is ${JSON.stringify(user)}`);
    if (user.phoneNo) {
      const accessToken = await generateAccessToken(user);
      const refreshToken = await generateRefreshToken(user);
      res.setHeader("accessToken", accessToken);
      res.setHeader("refreshToken", refreshToken);
      res.redirect(
        `https://event-frontend-omega.vercel.app/google/Login?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}`
      );
    } else {
      return res.redirect(
        `https://event-frontend-omega.vercel.app/signup1?id=${encodeURIComponent(user.id)}`
      );
    }
  } catch (err) {
    console.log(err);
    res.redirect("https://event-frontend-omega.vercel.app/signup");
  }
});
const logoutUser = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user?.id;
    // req.session.destroy((err) => {
    //   if (err) {
    //     return next(new ApiError(500, "Failed to logout", err));
    //   }
    //   res.clearCookie("connect.sid");
    //   // revokeGoogleToken(token);
    // });
    await prisma.admin.update({
      where: { id: parseInt(userId) },
      data: { refreshToken: null },
    });
    res
      .status(200)
      .clearCookie("connect.sid", cookieOptions)
      .clearCookie("accessToken", cookieOptions)
      .clearCookie("refreshToken", cookieOptions)
      .json(new ApiResponse(200, {}, "User logged out successfully"));
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});
// function revokeGoogleToken(token) {
//   return new Promise((resolve, reject) => {
//     oauth2Client.revokeToken(token, (err, body) => {
//       if (err) {
//         console.error("Failed to revoke token:", err);
//         return reject(err);
//       }
//       console.log("Token revoked:", body);
//       resolve(body);
//     });
//   });
// }
export {
  registerWithEmail,
  fullRegisteration,
  loginWithEmail,
  refreshAccessToken,
  forgetPassword,
  verifyResetToken,
  checkTokenValidity,
  changePassword,
  logoutUser,
  verifyEmail,
  googleCheck,
};
