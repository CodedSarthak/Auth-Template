import { z } from "zod";

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

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type GoogleLoginDto = z.infer<typeof googleLoginSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationDto = z.infer<typeof resendVerificationSchema>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type GenerateAvatarUploadUrlDto = z.infer<typeof generateAvatarUploadUrlSchema>;
export type ConfirmAvatarUploadDto = z.infer<typeof confirmAvatarUploadSchema>;
export type LogoutSpecificSessionDto = z.infer<typeof logoutSpecificSessionSchema>;

