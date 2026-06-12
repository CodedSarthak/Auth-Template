import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";

type CreateUserData = Prisma.UserCreateInput;
type UpdateUserData = Prisma.UserUpdateInput;

export const UserRepository = {

    async findUserByEmail(email: string) {
        return await prisma.user.findUnique({ where: { email } });
    },

    async findUserById(userId: string) {
        return await prisma.user.findUnique({ where: { id: userId } });
    },

    async createUser(userData: CreateUserData) {
        return await prisma.user.create({ data: userData });
    },

    async updateUser(id: string, userData: UpdateUserData) {
        return await prisma.user.update({ where: { id }, data: userData });
    },

    async deleteUser(id: string) {
        return await prisma.user.delete({ where: { id } });
    },

    async findAccountByProvider(provider: "LOCAL" | "GOOGLE", providerAccountId: string) {
        return await prisma.account.findUnique({
            where: {
                provider_providerAccountId: {
                    provider,
                    providerAccountId,
                },
            },
        });
    },

    async createAccount(data: Prisma.AccountCreateInput) {
        return await prisma.account.create({ data });
    },

    async createSession(data: Prisma.SessionCreateInput) {
        return await prisma.session.create({ data });
    },

    async findSessionByRefreshTokenHash(refreshTokenHash: string) {
        return await prisma.session.findFirst({ where: { refreshTokenHash } });
    },

    async findActiveSessions(userId: string) {
        return await prisma.session.findMany({ where: { userId, expiresAt: { gte: new Date() } } });
    },

    async updateSession(id: string, data: Prisma.SessionUpdateInput) {
        return await prisma.session.update({ where: { id }, data });
    },

    async deleteSession(id: string) {
        return await prisma.session.delete({ where: { id } });
    },

    async deleteAllUserSessions(userId: string) {
        return await prisma.session.deleteMany({ where: { userId } });
    },

    async createEmailVerificationToken(data: Prisma.EmailVerificationTokenUncheckedCreateInput) {
        return await prisma.emailVerificationToken.create({ data });
    },

    async findEmailVerificationTokenByToken(token: string) {
        return await prisma.emailVerificationToken.findUnique({ where: { token } });
    },

    async findEmailVerificationToken(userId: string) {
        return await prisma.emailVerificationToken.findUnique({ where: { userId } });
    },

    async deleteEmailVerificationToken(id: string) {
        return await prisma.emailVerificationToken.delete({ where: { id } });
    },

    async createPasswordResetToken(data: Prisma.PasswordResetTokenUncheckedCreateInput) {
        return await prisma.passwordResetToken.create({ data });
    },

    async findPasswordResetToken(userId: string) {
        return await prisma.passwordResetToken.findUnique({ where: { userId } });
    },

    async findPasswordResetTokenByToken(token: string) {
        return await prisma.passwordResetToken.findUnique({ where: { token } });
    },

    async findSessionById(id: string) {
        return await prisma.session.findUnique({ where: { id } });
    },

    async deletePasswordResetToken(id: string) {
        return await prisma.passwordResetToken.delete({ where: { id } });
    },
};