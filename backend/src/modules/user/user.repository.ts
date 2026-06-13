import { Prisma } from "@prisma/client";
import { prisma, DB } from "../../config/prisma.js";

type CreateUserData = Prisma.UserCreateInput;
type UpdateUserData = Prisma.UserUpdateInput;

export const UserRepository = {

    async findUserByEmail(email: string, tx: DB = prisma) {
        return await tx.user.findUnique({ where: { email } });
    },

    async findUserById(userId: string, tx: DB = prisma) {
        return await tx.user.findUnique({ where: { id: userId } });
    },

    async createUser(userData: CreateUserData, tx: DB = prisma) {
        return await tx.user.create({ data: userData });
    },

    async updateUser(id: string, userData: UpdateUserData, tx: DB = prisma) {
        return await tx.user.update({ where: { id }, data: userData });
    },

    async deleteUser(id: string, tx: DB = prisma) {
        return await tx.user.delete({ where: { id } });
    },

    async findAccountByProvider(provider: "LOCAL" | "GOOGLE", providerAccountId: string, tx: DB = prisma) {
        return await tx.account.findUnique({
            where: {
                provider_providerAccountId: {
                    provider,
                    providerAccountId,
                },
            },
        });
    },

    async createAccount(data: Prisma.AccountCreateInput, tx: DB = prisma) {
        return await tx.account.create({ data });
    },

    async createSession(data: Prisma.SessionCreateInput, tx: DB = prisma) {
        return await tx.session.create({ data });
    },

    async findActiveSessions(userId: string, tx: DB = prisma) {
        return await tx.session.findMany({ where: { userId, expiresAt: { gte: new Date() } } });
    },

    async updateSession(id: string, data: Prisma.SessionUpdateInput, tx: DB = prisma) {
        return await tx.session.update({ where: { id }, data });
    },

    async deleteSession(id: string, tx: DB = prisma) {
        return await tx.session.delete({ where: { id } });
    },

    async deleteAllUserSessions(userId: string, tx: DB = prisma) {
        return await tx.session.deleteMany({ where: { userId } });
    },

    async createEmailVerificationToken(data: Prisma.EmailVerificationTokenUncheckedCreateInput, tx: DB = prisma) {
        return await tx.emailVerificationToken.create({ data });
    },

    async findEmailVerificationTokenByToken(token: string, tx: DB = prisma) {
        return await tx.emailVerificationToken.findUnique({ where: { token } });
    },

    async findEmailVerificationToken(userId: string, tx: DB = prisma) {
        return await tx.emailVerificationToken.findUnique({ where: { userId } });
    },

    async deleteEmailVerificationToken(id: string, tx: DB = prisma) {
        return await tx.emailVerificationToken.delete({ where: { id } });
    },

    async createPasswordResetToken(data: Prisma.PasswordResetTokenUncheckedCreateInput, tx: DB = prisma) {
        return await tx.passwordResetToken.create({ data });
    },

    async findPasswordResetToken(userId: string, tx: DB = prisma) {
        return await tx.passwordResetToken.findUnique({ where: { userId } });
    },

    async findPasswordResetTokenByToken(token: string, tx: DB = prisma) {
        return await tx.passwordResetToken.findUnique({ where: { token } });
    },

    async findSessionById(id: string, tx: DB = prisma) {
        return await tx.session.findUnique({ where: { id } });
    },

    async deletePasswordResetToken(id: string, tx: DB = prisma) {
        return await tx.passwordResetToken.delete({ where: { id } });
    },
    
    async deleteExpiredTokens(tx: DB = prisma) {
        const now = new Date();
        const deletedSessions = await tx.session.deleteMany({ where: { expiresAt: { lt: now } } });
        const deletedEmailTokens = await tx.emailVerificationToken.deleteMany({ where: { expiresAt: { lt: now } } });
        const deletedPasswordTokens = await tx.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } });
        
        return {
            sessions: deletedSessions.count,
            emailTokens: deletedEmailTokens.count,
            passwordTokens: deletedPasswordTokens.count
        };
    }
};