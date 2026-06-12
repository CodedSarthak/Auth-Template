import { UserRepository } from "./user.repository.js";
import { RegisterDto, LoginDto, GoogleLoginDto, ForgotPasswordDto, UpdateProfileDto, GenerateAvatarUploadUrlDto } from "./user.dto.js";
import { validateMimeType } from "../../utils/validateMime.js";
import { generateFileKey } from "../../utils/s3FileKey.js";
import { generateUploadPresignedUrl, deleteObject, checkObjectExists } from "../../utils/s3Utils.js";
import { hashPassword, comparePassword } from "../../utils/bcrypt.js";
import { generateRandomToken } from "../../utils/token.js";
import { sendEmail } from "../../config/email.js";
import { env } from "../../config/getEnvVars.js";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.js";
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

        const user = await UserRepository.createUser({
            name: data.name,
            email: data.email,
            passwordHash,
        });

        const account = await UserRepository.createAccount({
            provider: AuthProvider.LOCAL,
            providerAccountId: user.id,
            user: { connect: { id: user.id } },
        });

        const token = generateRandomToken();

        const expirationMinutes = parseInt(env.TOKEN_EXPIRATION_TIME, 10) || 1440;
        const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

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
            <p>This link will expire in ${expirationMinutes} minutes.</p>
        `;

        await sendEmail(user.email, "Verify your email", htmlContent);

        return {
            success: true,
            message: "Registration successful. Please check your email to verify your account.",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                accounts: account.provider,
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
        const refreshToken = generateRefreshToken({ userId: user.id });

        const refreshTokenHash = await hashPassword(refreshToken);
        const refreshExpiresAt = new Date(Date.now() + parseInt(env.JWT_REFRESH_EXPIRATION) * 60 * 60 * 1000);

        await UserRepository.createSession({
            user: { connect: { id: user.id } },
            refreshTokenHash,
            userAgent: data.agent,
            ipAddress: data.ip,
            expiresAt: refreshExpiresAt,
        })

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
        const expirationMinutes = parseInt(env.TOKEN_EXPIRATION_TIME, 10) || 1440;
        const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

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
            <p>This link will expire in ${expirationMinutes} minutes.</p>
        `;

        await sendEmail(user.email, "Reset your password", htmlContent);

        return {
            success: true,
            message: "If the email is registered, a password reset link has been sent.",
        };
    },

    async googleLogin(data: GoogleLoginDto) {

        const ticket = await googleClient.verifyIdToken({
            idToken: data.idToken,
            audience: env.GOOGLE_CLIENT_ID,
        });

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
        const refreshToken = generateRefreshToken({ userId: user.id });

        const refreshTokenHash = await hashPassword(refreshToken);
        const refreshExpiresAt = new Date(Date.now() + parseInt(env.JWT_REFRESH_EXPIRATION) * 60 * 60 * 1000);

        await UserRepository.createSession({
            user: { connect: { id: user.id } },
            refreshTokenHash,
            userAgent: data.agent,
            ipAddress: data.ip,
            expiresAt: refreshExpiresAt,
        });

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
        const expectedPrefix = `avatars/${userId}/`;

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

        const refreshTokenHash = await hashPassword(refreshToken);
        const session = await UserRepository.findSessionByRefreshTokenHash(refreshTokenHash);

        if (!session) {
            throw new UnauthorizedException("Invalid or expired refresh token.");
        }

        await UserRepository.deleteSession(session.id);

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



};