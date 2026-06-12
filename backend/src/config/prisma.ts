import { Prisma, PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export type DB = PrismaClient | Prisma.TransactionClient;