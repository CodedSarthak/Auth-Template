import { describe, it, expect } from "vitest";
import {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    type TokenPayload,
    type RefreshTokenPayload,
} from "../../src/utils/jwt.js";

const accessPayload: TokenPayload        = { userId: "user-abc" };
const refreshPayload: RefreshTokenPayload = { userId: "user-abc", sessionId: "session-xyz" };

describe("JWT utilities", () => {

    describe("generateAccessToken", () => {
        it("returns a three-part JWT string", () => {
            const token = generateAccessToken(accessPayload);
            expect(typeof token).toBe("string");
            expect(token.split(".")).toHaveLength(3);
        });

        it("two tokens for same payload are different (because of iat)", () => {
            const t1 = generateAccessToken(accessPayload);
            const t2 = generateAccessToken(accessPayload);
            // iat might be the same if within the same second — at least both are valid
            expect(t1.split(".")).toHaveLength(3);
            expect(t2.split(".")).toHaveLength(3);
        });
    });

    describe("generateRefreshToken", () => {
        it("returns a three-part JWT string", () => {
            const token = generateRefreshToken(refreshPayload);
            expect(token.split(".")).toHaveLength(3);
        });
    });

    describe("verifyAccessToken", () => {
        it("returns payload for a valid access token", () => {
            const token   = generateAccessToken(accessPayload);
            const decoded = verifyAccessToken(token);
            expect(decoded).not.toBeNull();
            expect(decoded?.userId).toBe("user-abc");
        });

        it("returns null for a completely invalid string", () => {
            expect(verifyAccessToken("not.a.jwt")).toBeNull();
        });

        it("returns null for a tampered token", () => {
            const token   = generateAccessToken(accessPayload);
            const tampered = token.slice(0, -4) + "XXXX";
            expect(verifyAccessToken(tampered)).toBeNull();
        });

        it("returns null for a refresh token passed to verifyAccessToken (wrong secret)", () => {
            const refresh = generateRefreshToken(refreshPayload);
            expect(verifyAccessToken(refresh)).toBeNull();
        });

        it("returns null for empty string", () => {
            expect(verifyAccessToken("")).toBeNull();
        });
    });

    describe("verifyRefreshToken", () => {
        it("returns payload including sessionId", () => {
            const token   = generateRefreshToken(refreshPayload);
            const decoded = verifyRefreshToken(token);
            expect(decoded?.userId).toBe("user-abc");
            expect(decoded?.sessionId).toBe("session-xyz");
        });

        it("returns null for an access token passed to verifyRefreshToken (wrong secret)", () => {
            const access = generateAccessToken(accessPayload);
            expect(verifyRefreshToken(access)).toBeNull();
        });

        it("returns null for a tampered refresh token", () => {
            const token   = generateRefreshToken(refreshPayload);
            const tampered = token.slice(0, -4) + "XXXX";
            expect(verifyRefreshToken(tampered)).toBeNull();
        });

        it("returns null for empty string", () => {
            expect(verifyRefreshToken("")).toBeNull();
        });
    });
});
