import { describe, it, expect } from "vitest";
import { generateRandomToken } from "../../src/utils/token.js";

describe("generateRandomToken", () => {
    it("returns a lowercase hex string", () => {
        const token = generateRandomToken();
        expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });

    it("defaults to 64 hex characters (32 bytes → 64 hex chars)", () => {
        expect(generateRandomToken()).toHaveLength(64);
    });

    it("respects a custom byte length of 16 → 32 hex chars", () => {
        expect(generateRandomToken(16)).toHaveLength(32);
    });

    it("respects a custom byte length of 64 → 128 hex chars", () => {
        expect(generateRandomToken(64)).toHaveLength(128);
    });

    it("generates unique tokens across 200 calls", () => {
        const tokens = new Set(Array.from({ length: 200 }, () => generateRandomToken()));
        expect(tokens.size).toBe(200);
    });
});
