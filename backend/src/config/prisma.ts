import { Prisma, PrismaClient } from "@prisma/client";

import { env } from "./getEnvVars.js";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient();

if (env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export type DB = PrismaClient | Prisma.TransactionClient;