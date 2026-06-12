import { z } from "zod";

export const registerSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(100),

    email: z
        .string()
        .trim()
        .email("Invalid email"),

    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128)
        .regex(/[A-Z]/, "Must contain one uppercase letter")
        .regex(/[a-z]/, "Must contain one lowercase letter")
        .regex(/[0-9]/, "Must contain one number")
        .regex(/[^A-Za-z0-9]/, "Must contain one special character")
});

export const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .email(),

    password: z
        .string()
        .min(1, "Password is required"),

    agent: z
        .string()
        .optional(),

    ip: z
        .string()
        .optional()
});

export const googleLoginSchema = z.object({
    idToken: z.string().min(1),
    agent: z.string().optional(),
    ip: z.string().optional()
});

export const forgotPasswordSchema = z.object({
    email: z
        .string()
        .trim()
        .email()
});

export const resetPasswordSchema = z.object({
    token: z
        .string()
        .min(1, "Token is required"),

    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128)
        .regex(/[A-Z]/, "Must contain one uppercase letter")
        .regex(/[a-z]/, "Must contain one lowercase letter")
        .regex(/[0-9]/, "Must contain one number")
        .regex(/[^A-Za-z0-9]/, "Must contain one special character")
});

export const verifyEmailSchema = z.object({
    token: z
        .string()
        .min(1)
});

export const resendVerificationSchema = z.object({
    email: z
        .string()
        .trim()
        .email()
});

export const updateProfileSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2)
        .max(100)
        .optional()
});

export const generateAvatarUploadUrlSchema = z.object({
    fileName: z
        .string()
        .min(1),

    contentType: z.enum([
        "image/jpeg",
        "image/png",
        "image/webp"
    ])
});

export const confirmAvatarUploadSchema = z.object({
    fileKey: z.string().min(1, "File key is required")
});

export const logoutSpecificSessionSchema = z.object({
    sessionId: z.string().min(1, "Session ID is required")
});