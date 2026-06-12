import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword } from "../../src/utils/bcrypt.js";

describe("bcrypt utilities", () => {

    describe("hashPassword", () => {
        it("returns a bcrypt hash string", async () => {
            const hash = await hashPassword("MyPass@123");
            expect(typeof hash).toBe("string");
            expect(hash.startsWith("$2b$")).toBe(true);
        });

        it("produces a different hash each call (non-deterministic salt)", async () => {
            const h1 = await hashPassword("MyPass@123");
            const h2 = await hashPassword("MyPass@123");
            expect(h1).not.toBe(h2);
        });

        it("hashes the empty string without throwing", async () => {
            await expect(hashPassword("")).resolves.toMatch(/^\$2b\$/);
        });
    });

    describe("comparePassword", () => {
        it("returns true for the correct password", async () => {
            const hash = await hashPassword("MyPass@123");
            expect(await comparePassword("MyPass@123", hash)).toBe(true);
        });

        it("returns false for an incorrect password", async () => {
            const hash = await hashPassword("MyPass@123");
            expect(await comparePassword("WrongPass@1", hash)).toBe(false);
        });

        it("returns false for empty string vs a real hash", async () => {
            const hash = await hashPassword("MyPass@123");
            expect(await comparePassword("", hash)).toBe(false);
        });

        it("is case-sensitive", async () => {
            const hash = await hashPassword("mypass@123");
            expect(await comparePassword("MYPASS@123", hash)).toBe(false);
        });
    });
});
