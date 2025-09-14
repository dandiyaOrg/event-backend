import { Router } from "express";
import {
  registerWithEmail,
  fullRegisteration,
  loginWithEmail,
  refreshAccessToken,
  forgetPassword,
  changePassword,
  verifyResetToken,
  logoutUser,
  googleCheck,
  checkTokenValidity,
  verifyEmail,
} from "../controllers/auth.controller.js";
import passport from "passport";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(registerWithEmail);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/forget-password").post(forgetPassword);
router.route("/fullRegister").post(fullRegisteration);
router.route("/login").post(loginWithEmail);
router.route("/validate").get(checkTokenValidity);
router.route("/verify/:token").get(verifyEmail);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "https://event-frontend-omega.vercel.app/signup",
  }),
  googleCheck
);

router
  .route("/reset-password/:token")
  .get(verifyResetToken)
  .post(changePassword);
export default router;
