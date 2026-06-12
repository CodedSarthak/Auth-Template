import { Router } from "express";
import * as UserController from "./user.controller.js";
import { authenticateToken } from "../../middleware/auth.middleware.js";

const router = Router();

// Public auth routes
router.post("/register", UserController.register);
router.post("/verify-email", UserController.verifyEmail);
router.post("/resend-verification", UserController.resendVerification);
router.post("/login", UserController.login);
router.post("/login/google", UserController.googleLogin);
router.post("/forgot-password", UserController.forgotPassword);
router.post("/reset-password", UserController.resetPassword);

// Refresh token
router.post("/refresh", UserController.refreshToken);

// Logout (clears current session based on cookie)
router.post("/logout", UserController.logout);

// Protected auth routes (requires valid access token)

router.get("/me", authenticateToken, UserController.getCurrentUser);
router.delete("/sessions", authenticateToken, UserController.logoutAllDevices);
router.patch("/profile", authenticateToken, UserController.updateProfile);

router.post("/avatar/upload-url", authenticateToken, UserController.generateAvatarUploadUrl);
router.patch("/avatar", authenticateToken, UserController.confirmAvatarUpload);

router.get("/sessions", authenticateToken, UserController.getActiveSessions);
router.delete("/sessions/:sessionId", authenticateToken, UserController.logoutSpecificSession);

export default router;
