import { UserRepository } from "./user.repository.js";
import { prisma } from "../../config/prisma.js";
import { RegisterDto, LoginDto, GoogleLoginDto, ForgotPasswordDto, UpdateProfileDto, GenerateAvatarUploadUrlDto, ResetPasswordDto, ResendVerificationDto } from "./user.dto.js";
import { validateMimeType } from "../../utils/validateMime.js";
import { generateFileKey } from "../../utils/s3FileKey.js";
import { generateUploadPresignedUrl, deleteObject, checkObjectExists } from "../../utils/s3Utils.js";
import { hashPassword, comparePassword } from "../../utils/bcrypt.js";
import { parseDurationMs } from "../../utils/parseDuration.js";
import { generateRandomToken } from "../../utils/token.js";
import { sendEmail } from "../../config/email.js";
import { env } from "../../config/getEnvVars.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../utils/jwt.js";
import { AuthProvider } from "@prisma/client";
import { googleClient } from "../../config/googleClient.js";
import { BadRequestException, NotFoundException, ForbiddenException, ConflictException, UnauthorizedException } from "../../errors/errors.js";
import { logger } from "../../config/logger.js";

export const UserServices = {
    async register(data: RegisterDto) {

        const existingUser = await UserRepository.findUserByEmail(data.email);
        if (existingUser) {
            throw new ConflictException("User already exists with this email");
        }

        const passwordHash = await hashPassword(data.password);
        const token = generateRandomToken();
        const expirationMs = parseDurationMs(env.TOKEN_EXPIRATION_TIME);
        const expiresAt = new Date(Date.now() + expirationMs);

        const user = await prisma.$transaction(async (tx) => {
            const newUser = await UserRepository.createUser({
                name: data.name,
                email: data.email,
                passwordHash,
            }, tx);

            const account = await UserRepository.createAccount({
                provider: AuthProvider.LOCAL,
                providerAccountId: newUser.id,
                user: { connect: { id: newUser.id } },
            }, tx);

            await UserRepository.createEmailVerificationToken({
                token,
                userId: newUser.id,
                expiresAt,
            }, tx);

            return newUser;
        });

        const verificationLink = `${env.FRONTEND_URL}/verify-email?token=${token}`;

        const htmlContent = `
            <h2>Welcome to our platform!</h2>
            <p>Please verify your email address by clicking the link below:</p>
            <a href="${verificationLink}">Verify Email</a>
            <p>This link will expire in ${env.TOKEN_EXPIRATION_TIME}.</p>
        `;

        await sendEmail(user.email, "Verify your email", htmlContent);

        return {
            success: true,
            message: "Registration successful. Please check your email to verify your account.",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                accounts: [AuthProvider.LOCAL],
            }
        };
    },

    async verifyEmail(token: string) {

        const verificationToken = await UserRepository.findEmailVerificationTokenByToken(token);

        if (!verificationToken) {
            throw new BadRequestException("Invalid or expired verification token.");
        }

        if (new Date() > verificationToken.expiresAt) {
            await UserRepository.deleteEmailVerificationToken(verificationToken.id);
            throw new BadRequestException("Verification token has expired. Please request a new one.");
        }

        await UserRepository.updateUser(verificationToken.userId, {
            emailVerified: true,
        });

        await UserRepository.deleteEmailVerificationToken(verificationToken.id);

        return {
            success: true,
            message: "Email successfully verified. You can now log in.",
        };
    },

    async login(data: LoginDto) {

        const user = await UserRepository.findUserByEmail(data.email);

        if (!user) {
            throw new UnauthorizedException("Invalid email or password.");
        }

        if (!user.passwordHash) {
            throw new BadRequestException("User registered with an OAuth provider. Please login using that provider.");
        }

        const isPasswordValid = await comparePassword(data.password, user.passwordHash);

        if (!isPasswordValid) {
            throw new UnauthorizedException("Invalid email or password.");
        }

        if (!user.emailVerified) {
            throw new ForbiddenException("Please verify your email before logging in.");
        }

        const accessToken = generateAccessToken({ userId: user.id });
        const refreshExpiresAt = new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRATION));

        const session = await UserRepository.createSession({
            user: { connect: { id: user.id } },
            refreshTokenHash: "pending",
            userAgent: data.agent,
            ipAddress: data.ip,
            expiresAt: refreshExpiresAt,
        });

        const refreshToken = generateRefreshToken({ userId: user.id, sessionId: session.id });
        const refreshTokenHash = await hashPassword(refreshToken);

        await UserRepository.updateSession(session.id, { refreshTokenHash });

        return {
            success: true,
            message: "Login successful.",
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                profileImage: user.profileImage,
            }
        };
    },

    async forgotPassword(data: ForgotPasswordDto) {

        const user = await UserRepository.findUserByEmail(data.email);

        if (!user) {
            return {
                success: true,
                message: "If the email is registered, a password reset link has been sent.",
            };
        }

        if (!user.passwordHash) {
            throw new BadRequestException("User registered with an OAuth provider. Password reset is not applicable.");
        }

        const existingToken = await UserRepository.findPasswordResetToken(user.id);
        if (existingToken) {
            await UserRepository.deletePasswordResetToken(existingToken.id);
        }

        const token = generateRandomToken();
        const expirationMs = parseDurationMs(env.TOKEN_EXPIRATION_TIME);
        const expiresAt = new Date(Date.now() + expirationMs);

        await UserRepository.createPasswordResetToken({
            token,
            userId: user.id,
            expiresAt,
        });

        const resetLink = `${env.FRONTEND_URL}/reset-password?token=${token}`;
        const htmlContent = `
            <h2>Reset Your Password</h2>
            <p>Please click the link below to reset your password:</p>
            <a href="${resetLink}">Reset Password</a>
            <p>This link will expire in ${env.TOKEN_EXPIRATION_TIME}.</p>
        `;

        await sendEmail(user.email, "Reset your password", htmlContent);

        return {
            success: true,
            message: "If the email is registered, a password reset link has been sent.",
        };
    },

    async resetPassword(data: ResetPasswordDto) {
        const resetToken = await UserRepository.findPasswordResetTokenByToken(data.token);

        if (!resetToken) {
            throw new BadRequestException("Invalid or expired password reset token.");
        }

        if (new Date() > resetToken.expiresAt) {
            await UserRepository.deletePasswordResetToken(resetToken.id);
            throw new BadRequestException("Password reset token has expired. Please request a new one.");
        }

        const passwordHash = await hashPassword(data.password);

        await UserRepository.updateUser(resetToken.userId, {
            passwordHash,
        });

        await UserRepository.deletePasswordResetToken(resetToken.id);

        await UserRepository.deleteAllUserSessions(resetToken.userId);

        return {
            success: true,
            message: "Password has been successfully reset.",
        };
    },

    async resendVerification(data: ResendVerificationDto) {
        const user = await UserRepository.findUserByEmail(data.email);

        if (!user) {
            return {
                success: true,
                message: "If the email is registered and unverified, a new verification email has been sent.",
            };
        }

        if (user.emailVerified) {
            return {
                success: true,
                message: "If the email is registered and unverified, a new verification email has been sent.",
            };
        }

        const existingToken = await UserRepository.findEmailVerificationToken(user.id);
        if (existingToken) {
            await UserRepository.deleteEmailVerificationToken(existingToken.id);
        }

        const token = generateRandomToken();
        const expirationMs = parseDurationMs(env.TOKEN_EXPIRATION_TIME);
        const expiresAt = new Date(Date.now() + expirationMs);

        await UserRepository.createEmailVerificationToken({
            token,
            userId: user.id,
            expiresAt,
        });

        const verificationLink = `${env.FRONTEND_URL}/verify-email?token=${token}`;

        const htmlContent = `
            <h2>Welcome to our platform!</h2>
            <p>Please verify your email address by clicking the link below:</p>
            <a href="${verificationLink}">Verify Email</a>
            <p>This link will expire in ${env.TOKEN_EXPIRATION_TIME}.</p>
        `;

        await sendEmail(user.email, "Verify your email", htmlContent);

        return {
            success: true,
            message: "A new verification email has been sent.",
        };
    },

    async getActiveSessions(userId: string) {
        const sessions = await UserRepository.findActiveSessions(userId);

        return {
            success: true,
            sessions: sessions.map(s => ({
                id: s.id,
                userAgent: s.userAgent,
                ipAddress: s.ipAddress,
                lastUsedAt: s.lastUsedAt,
                createdAt: s.createdAt,
            }))
        };
    },

    async logoutSpecificSession(userId: string, sessionId: string) {
        const session = await UserRepository.findSessionById(sessionId);

        if (!session) {
            throw new NotFoundException("Session not found.");
        }

        if (session.userId !== userId) {
            throw new ForbiddenException("You do not have permission to delete this session.");
        }

        await UserRepository.deleteSession(sessionId);

        return {
            success: true,
            message: "Session successfully logged out.",
        };
    },

    async googleLogin(data: GoogleLoginDto) {

        let ticket;

        try {
            ticket = await googleClient.verifyIdToken({
                idToken: data.idToken,
                audience: env.GOOGLE_CLIENT_ID,
            });
        } catch (error) {
            throw new UnauthorizedException("Invalid Google token.");
        }

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            throw new UnauthorizedException("Invalid Google token.");
        }

        const { email, name, sub, picture } = payload;

        let user = await UserRepository.findUserByEmail(email);

        if (!user) {
            user = await UserRepository.createUser({
                email,
                name: name || "",
                profileImage: picture || "",
                emailVerified: true,
            });
        } else {
            if (!user.emailVerified) {
                await UserRepository.updateUser(user.id, { emailVerified: true });
            }
        }

        let account = await UserRepository.findAccountByProvider(AuthProvider.GOOGLE, sub);

        if (!account) {
            account = await UserRepository.createAccount({
                provider: AuthProvider.GOOGLE,
                providerAccountId: sub,
                user: { connect: { id: user.id } },
            });
        }

        const accessToken = generateAccessToken({ userId: user.id });
        const refreshExpiresAt = new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRATION));

        // Create the session first so we have its ID to embed in the refresh token
        const session = await UserRepository.createSession({
            user: { connect: { id: user.id } },
            refreshTokenHash: "pending",
            userAgent: data.agent,
            ipAddress: data.ip,
            expiresAt: refreshExpiresAt,
        });

        const refreshToken = generateRefreshToken({ userId: user.id, sessionId: session.id });
        const refreshTokenHash = await hashPassword(refreshToken);

        await UserRepository.updateSession(session.id, { refreshTokenHash });

        return {
            success: true,
            message: "Google login successful.",
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                profileImage: user.profileImage,
            }
        };
    },

    async updateProfile(userId: string, data: UpdateProfileDto) {
        const updatedUser = await UserRepository.updateUser(userId, {
            name: data.name,
        });

        return {
            success: true,
            message: "Profile updated successfully.",
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                profileImage: updatedUser.profileImage,
            }
        };
    },

    async generateAvatarUploadUrl(userId: string, data: GenerateAvatarUploadUrlDto) {
        validateMimeType(data.contentType);

        const fileKey = generateFileKey(userId, data.fileName);

        const { uploadUrl, expiresIn } =
            await generateUploadPresignedUrl(
                fileKey,
                data.contentType
            );

        return {
            uploadUrl,
            fileKey,
            expiresIn,
        };
    },

    async confirmAvatarUpload(userId: string, fileKey: string) {
        const expectedPrefix = `users/${userId}/`;

        if (!fileKey.startsWith(expectedPrefix)) {
            throw new ForbiddenException("Invalid avatar key.");
        }

        const user = await UserRepository.findUserById(userId);

        if (!user) {
            throw new NotFoundException("User not found.");
        }

        const exists = await checkObjectExists(fileKey);

        if (!exists) {
            throw new BadRequestException("Avatar upload not found.");
        }

        const oldKey = user.profileImage;

        await UserRepository.updateUser(userId, {
            profileImage: fileKey,
        });

        if (oldKey) {
            deleteObject(oldKey).catch((err) => {
                logger.error(err, "Failed to delete old avatar");
            });
        }

        return {
            success: true,
        };
    },

    async logout(refreshToken: string) {

        const payload = verifyRefreshToken(refreshToken);
        if (!payload) {
            return { success: true, message: "Logout successful." };
        }

        const session = await UserRepository.findSessionById(payload.sessionId);

        if (session) {
            const isValid = await comparePassword(refreshToken, session.refreshTokenHash);
            if (isValid) {
                await UserRepository.deleteSession(session.id);
            }
        }

        return {
            success: true,
            message: "Logout successful.",
        };
    },

    async logoutAllDevices(userId: string) {

        await UserRepository.deleteAllUserSessions(userId);

        return {
            success: true,
            message: "Logout all devices successful.",
        };
    },

    async getCurrentUser(userId: string) {

        const user = await UserRepository.findUserById(userId);
        if (!user) {
            throw new NotFoundException("User not found.");
        }
        return {
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                profileImage: user.profileImage,
                emailVerified: user.emailVerified,
            }
        };
    },

    async refreshToken(refreshToken: string, ip: string, agent: string) {

        if (!refreshToken) {
            throw new UnauthorizedException("No refresh token provided.");
        }

        const payload = verifyRefreshToken(refreshToken);
        if (!payload) {
            throw new UnauthorizedException("Invalid or expired refresh token.");
        }

        const session = await UserRepository.findSessionById(payload.sessionId);

        if (!session || new Date() > session.expiresAt) {
            throw new UnauthorizedException("Invalid or expired refresh token.");
        }

        const isValid = await comparePassword(refreshToken, session.refreshTokenHash);

        if (!isValid) {
            await UserRepository.deleteSession(session.id);
            logger.warn(
                { sessionId: session.id, userId: payload.userId },
                "Refresh token reuse detected — session terminated."
            );
            throw new UnauthorizedException("Invalid or expired refresh token.");
        }

        const user = await UserRepository.findUserById(payload.userId);
        if (!user) {
            throw new UnauthorizedException("User not found.");
        }

        const newAccessToken = generateAccessToken({ userId: user.id });
        const newRefreshToken = generateRefreshToken({ userId: user.id, sessionId: session.id });
        const newRefreshTokenHash = await hashPassword(newRefreshToken);
        const refreshExpiresAt = new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRATION));

        await UserRepository.updateSession(session.id, {
            refreshTokenHash: newRefreshTokenHash,
            expiresAt: refreshExpiresAt,
            ipAddress: ip,
            userAgent: agent,
            lastUsedAt: new Date(),
        });

        return {
            success: true,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        };
    },

};