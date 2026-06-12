import { Request, Response } from "express";
import { UserServices } from "./user.services.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
    registerSchema,
    loginSchema,
    googleLoginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifyEmailSchema,
    resendVerificationSchema,
    updateProfileSchema,
    generateAvatarUploadUrlSchema,
    confirmAvatarUploadSchema,
    logoutSpecificSessionSchema,
} from "./user.validation.js";
import { env } from "../../config/getEnvVars.js";
import { parseDurationMs } from "../../utils/parseDuration.js";

const cookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict" as const,
};

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie("accessToken", accessToken, {
        ...cookieOptions,
        maxAge: parseDurationMs(env.JWT_ACCESS_EXPIRATION),
    });

    res.cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        maxAge: parseDurationMs(env.JWT_REFRESH_EXPIRATION),
    });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
    const data = registerSchema.parse(req.body);
    const result = await UserServices.register(data);
    res.status(201).json(result);
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const data = verifyEmailSchema.parse(req.body);
    const result = await UserServices.verifyEmail(data.token);
    res.status(200).json(result);
});

export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
    const data = resendVerificationSchema.parse(req.body);
    const result = await UserServices.resendVerification(data);
    res.status(200).json(result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
    const data = loginSchema.parse(req.body);
    data.ip = req.ip || "unknown";
    data.agent = req.get("User-Agent") || "unknown";
    
    const result = await UserServices.login(data);

    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.status(200).json({
        success: result.success,
        message: result.message,
        user: result.user,
    });
});

export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
    const data = googleLoginSchema.parse(req.body);
    data.ip = req.ip || "unknown";
    data.agent = req.get("User-Agent") || "unknown";
    
    const result = await UserServices.googleLogin(data);

    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.status(200).json({
        success: result.success,
        message: result.message,
        user: result.user,
    });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const data = forgotPasswordSchema.parse(req.body);
    const result = await UserServices.forgotPassword(data);
    res.status(200).json(result);
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const data = resetPasswordSchema.parse(req.body);
    const result = await UserServices.resetPassword(data);
    res.status(200).json(result);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
        await UserServices.logout(refreshToken);
    }
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
    res.status(200).json({ success: true, message: "Logout successful." });
});

export const logoutAllDevices = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const result = await UserServices.logoutAllDevices(userId);
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
    res.status(200).json(result);
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const data = updateProfileSchema.parse(req.body);
    const result = await UserServices.updateProfile(userId, data);
    res.status(200).json(result);
});

export const generateAvatarUploadUrl = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const data = generateAvatarUploadUrlSchema.parse(req.body);
    const result = await UserServices.generateAvatarUploadUrl(userId, data);
    res.status(200).json(result);
});

export const confirmAvatarUpload = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { fileKey } = confirmAvatarUploadSchema.parse(req.body);
    const result = await UserServices.confirmAvatarUpload(userId, fileKey);
    res.status(200).json(result);
});

export const getActiveSessions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const result = await UserServices.getActiveSessions(userId);
    res.status(200).json(result);
});

export const logoutSpecificSession = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { sessionId } = logoutSpecificSessionSchema.parse(req.params);
    const result = await UserServices.logoutSpecificSession(userId, sessionId);
    res.status(200).json(result);
});

export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const result = await UserServices.getCurrentUser(userId);
    res.status(200).json(result);
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.refreshToken;
    const ip = req.ip || "unknown";
    const agent = req.get("User-Agent") || "unknown";

    const result = await UserServices.refreshToken(token, ip, agent);

    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.status(200).json({
        success: result.success,
        accessToken: result.accessToken
    });
});
