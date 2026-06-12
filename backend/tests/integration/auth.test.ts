/**
 * Integration tests for all auth routes.
 *
 * External services mocked:
 *  - Prisma      → vi.fn() stubs
 *  - bcrypt      → deterministic fake (fast, no 10-round cost)
 *  - sendEmail   → no-op
 *  - googleClient→ configurable mock
 *  - S3 utils    → configurable mock
 *  - Rate limiter→ pass-through
 *  - requestLogger→ no-op
 *
 * Real dependencies used:
 *  - JWT (sign / verify with test secrets from tests/setup.ts)
 *  - Zod validation schemas
 *  - Error middleware
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

// ─── Mocks (hoisted before imports) ───────────────────────────────────────────

vi.mock("../../src/middleware/globalRateLimiter.js", () => ({
    globalRateLimiter: (_req: any, _res: any, next: any) => next(),
}));

vi.mock("../../src/middleware/requestLogger.js", () => ({
    requestLogger: (_req: any, _res: any, next: any) => next(),
}));

vi.mock("../../src/config/prisma.js", () => ({
    prisma: {
        user: {
            findUnique:  vi.fn(),
            create:      vi.fn(),
            update:      vi.fn(),
            delete:      vi.fn(),
        },
        account: {
            findUnique:  vi.fn(),
            create:      vi.fn(),
        },
        session: {
            create:      vi.fn(),
            findUnique:  vi.fn(),
            findMany:    vi.fn(),
            update:      vi.fn(),
            delete:      vi.fn(),
            deleteMany:  vi.fn(),
        },
        emailVerificationToken: {
            create:      vi.fn(),
            findUnique:  vi.fn(),
            delete:      vi.fn(),
        },
        passwordResetToken: {
            create:      vi.fn(),
            findUnique:  vi.fn(),
            delete:      vi.fn(),
        },
    },
}));

// Deterministic bcrypt — keeps tests fast and predictable
vi.mock("../../src/utils/bcrypt.js", () => ({
    hashPassword:    vi.fn(async (p: string) => `hashed::${p}`),
    comparePassword: vi.fn(async (plain: string, hash: string) => hash === `hashed::${plain}`),
}));

vi.mock("../../src/config/email.js", () => ({
    sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/config/googleClient.js", () => ({
    googleClient: { verifyIdToken: vi.fn() },
}));

vi.mock("../../src/utils/s3Utils.js", () => ({
    generateUploadPresignedUrl: vi.fn(),
    checkObjectExists:          vi.fn(),
    deleteObject:               vi.fn().mockResolvedValue(undefined),
}));

// ─── Actual imports (after mocks are established) ─────────────────────────────

import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { googleClient } from "../../src/config/googleClient.js";
import { generateUploadPresignedUrl, checkObjectExists } from "../../src/utils/s3Utils.js";
import { generateAccessToken, generateRefreshToken } from "../../src/utils/jwt.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE = "/api/auth";

/** A verified local user as would come from prisma.user.findUnique */
const mockUser = (overrides: Record<string, any> = {}) => ({
    id:            "user-123",
    name:          "John Doe",
    email:         "john@example.com",
    passwordHash:  "hashed::Secure@123",
    emailVerified: true,
    profileImage:  null,
    createdAt:     new Date("2024-01-01"),
    updatedAt:     new Date("2024-01-01"),
    ...overrides,
});

const mockSession = (overrides: Record<string, any> = {}) => ({
    id:               "session-123",
    userId:           "user-123",
    refreshTokenHash: "",        // caller must set the correct hash
    userAgent:        "jest",
    ipAddress:        "127.0.0.1",
    createdAt:        new Date(),
    expiresAt:        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    lastUsedAt:       new Date(),
    ...overrides,
});

const mockEmailToken = (overrides: Record<string, any> = {}) => ({
    id:        "token-123",
    token:     "valid-email-token",
    userId:    "user-123",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    createdAt: new Date(),
    ...overrides,
});

const mockPasswordResetToken = (overrides: Record<string, any> = {}) => ({
    id:        "reset-token-123",
    token:     "valid-reset-token",
    userId:    "user-123",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    createdAt: new Date(),
    ...overrides,
});

/** Bearer header for protected routes */
function authHeader(userId = "user-123") {
    const token = generateAccessToken({ userId });
    return `Bearer ${token}`;
}

/** Refresh token cookie value (deterministic bcrypt makes lookups predictable) */
function makeRefreshCookie(userId = "user-123", sessionId = "session-123") {
    return generateRefreshToken({ userId, sessionId });
}

// ─── Reset all mocks between tests ────────────────────────────────────────────

beforeEach(() => {
    vi.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// HEALTH
// ══════════════════════════════════════════════════════════════════════════════

describe("GET /health", () => {
    it("returns 200 status: ok", async () => {
        const res = await request(app).get("/health");
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// REGISTER
// ══════════════════════════════════════════════════════════════════════════════

describe("POST /api/auth/register", () => {
    const valid = { name: "John Doe", email: "john@example.com", password: "Secure@123" };

    it("201 — creates user and sends verification email", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
        vi.mocked(prisma.user.create).mockResolvedValue(mockUser({ emailVerified: false }));
        vi.mocked(prisma.account.create).mockResolvedValue({ id: "acc-1", provider: "LOCAL" } as any);
        vi.mocked(prisma.emailVerificationToken.create).mockResolvedValue(mockEmailToken());

        const res = await request(app).post(`${BASE}/register`).send(valid);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.user.email).toBe("john@example.com");
    });

    it("409 — conflict when email already registered", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser());

        const res = await request(app).post(`${BASE}/register`).send(valid);

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
    });

    it("400 — validation: invalid email format", async () => {
        const res = await request(app)
            .post(`${BASE}/register`)
            .send({ ...valid, email: "not-an-email" });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Validation Error");
    });

    it("400 — validation: password too short", async () => {
        const res = await request(app)
            .post(`${BASE}/register`)
            .send({ ...valid, password: "abc" });
        expect(res.status).toBe(400);
    });

    it("400 — validation: password missing uppercase", async () => {
        const res = await request(app)
            .post(`${BASE}/register`)
            .send({ ...valid, password: "alllower@1" });
        expect(res.status).toBe(400);
    });

    it("400 — validation: password missing special character", async () => {
        const res = await request(app)
            .post(`${BASE}/register`)
            .send({ ...valid, password: "Secure1234" });
        expect(res.status).toBe(400);
    });

    it("400 — validation: name too short", async () => {
        const res = await request(app)
            .post(`${BASE}/register`)
            .send({ ...valid, name: "A" });
        expect(res.status).toBe(400);
    });

    it("400 — validation: missing body fields", async () => {
        const res = await request(app).post(`${BASE}/register`).send({});
        expect(res.status).toBe(400);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// VERIFY EMAIL
// ══════════════════════════════════════════════════════════════════════════════

describe("POST /api/auth/verify-email", () => {
    it("200 — verifies email for a valid unexpired token", async () => {
        vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue(mockEmailToken());
        vi.mocked(prisma.user.update).mockResolvedValue(mockUser({ emailVerified: true }));
        vi.mocked(prisma.emailVerificationToken.delete).mockResolvedValue(mockEmailToken());

        const res = await request(app)
            .post(`${BASE}/verify-email`)
            .send({ token: "valid-email-token" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("400 — invalid token (not found in DB)", async () => {
        vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue(null);

        const res = await request(app)
            .post(`${BASE}/verify-email`)
            .send({ token: "bad-token" });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("400 — expired token (expiresAt in past)", async () => {
        vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue(
            mockEmailToken({ expiresAt: new Date(Date.now() - 1000) })
        );
        vi.mocked(prisma.emailVerificationToken.delete).mockResolvedValue(mockEmailToken());

        const res = await request(app)
            .post(`${BASE}/verify-email`)
            .send({ token: "expired-token" });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain("expired");
    });

    it("400 — validation: missing token field", async () => {
        const res = await request(app).post(`${BASE}/verify-email`).send({});
        expect(res.status).toBe(400);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// RESEND VERIFICATION
// ══════════════════════════════════════════════════════════════════════════════

describe("POST /api/auth/resend-verification", () => {
    it("200 — success for existing unverified user", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser({ emailVerified: false }));
        vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue(null);
        vi.mocked(prisma.emailVerificationToken.create).mockResolvedValue(mockEmailToken());

        const res = await request(app)
            .post(`${BASE}/resend-verification`)
            .send({ email: "john@example.com" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("200 — same success response even when email not found (no enumeration)", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

        const res = await request(app)
            .post(`${BASE}/resend-verification`)
            .send({ email: "nobody@example.com" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("409 — conflict when email already verified", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser({ emailVerified: true }));

        const res = await request(app)
            .post(`${BASE}/resend-verification`)
            .send({ email: "john@example.com" });

        expect(res.status).toBe(409);
    });

    it("400 — validation: invalid email", async () => {
        const res = await request(app)
            .post(`${BASE}/resend-verification`)
            .send({ email: "bad" });
        expect(res.status).toBe(400);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════════════════════════

describe("POST /api/auth/login", () => {
    const valid = { email: "john@example.com", password: "Secure@123" };

    it("200 — success: sets accessToken and refreshToken cookies", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser());
        vi.mocked(prisma.session.create).mockResolvedValue(mockSession({ id: "session-123", refreshTokenHash: "pending" }));
        vi.mocked(prisma.session.update).mockResolvedValue(mockSession());

        const res = await request(app).post(`${BASE}/login`).send(valid);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.email).toBe("john@example.com");
        const cookies = res.headers["set-cookie"] as unknown as string[];
        expect(cookies.some((c: string) => c.startsWith("accessToken="))).toBe(true);
        expect(cookies.some((c: string) => c.startsWith("refreshToken="))).toBe(true);
    });

    it("401 — wrong password", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser());

        const res = await request(app)
            .post(`${BASE}/login`)
            .send({ ...valid, password: "WrongPass@1" });

        expect(res.status).toBe(401);
    });

    it("401 — user not found", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

        const res = await request(app).post(`${BASE}/login`).send(valid);
        expect(res.status).toBe(401);
    });

    it("400 — OAuth user (no passwordHash)", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser({ passwordHash: null }));

        const res = await request(app).post(`${BASE}/login`).send(valid);
        expect(res.status).toBe(400);
        expect(res.body.message).toContain("OAuth");
    });

    it("403 — unverified email", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(
            mockUser({ emailVerified: false })
        );

        const res = await request(app).post(`${BASE}/login`).send(valid);
        expect(res.status).toBe(403);
        expect(res.body.message).toContain("verify");
    });

    it("400 — validation: missing password", async () => {
        const res = await request(app)
            .post(`${BASE}/login`)
            .send({ email: "john@example.com" });
        expect(res.status).toBe(400);
    });

    it("400 — validation: invalid email format", async () => {
        const res = await request(app)
            .post(`${BASE}/login`)
            .send({ email: "bad", password: "Secure@123" });
        expect(res.status).toBe(400);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// GOOGLE LOGIN
// ══════════════════════════════════════════════════════════════════════════════

describe("POST /api/auth/login/google", () => {
    const googlePayload = {
        email: "jane@gmail.com",
        name:  "Jane Doe",
        sub:   "google-sub-123",
        picture: "https://lh3.googleusercontent.com/photo.jpg",
    };

    function setupGoogleMock(payload = googlePayload) {
        vi.mocked(googleClient.verifyIdToken).mockResolvedValue({
            getPayload: () => payload,
        } as any);
    }

    it("200 — creates a new user for first-time Google sign-in", async () => {
        setupGoogleMock();
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
        vi.mocked(prisma.user.create).mockResolvedValue(
            mockUser({ email: googlePayload.email, name: googlePayload.name, emailVerified: true })
        );
        vi.mocked(prisma.account.findUnique).mockResolvedValue(null);
        vi.mocked(prisma.account.create).mockResolvedValue({ id: "acc-2", provider: "GOOGLE" } as any);
        vi.mocked(prisma.session.create).mockResolvedValue(mockSession({ refreshTokenHash: "pending" }));
        vi.mocked(prisma.session.update).mockResolvedValue(mockSession());

        const res = await request(app)
            .post(`${BASE}/login/google`)
            .send({ idToken: "google-id-token" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("200 — signs in an existing user and links the Google account", async () => {
        setupGoogleMock();
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser({ emailVerified: false }));
        vi.mocked(prisma.user.update).mockResolvedValue(mockUser({ emailVerified: true }));
        vi.mocked(prisma.account.findUnique).mockResolvedValue(null);
        vi.mocked(prisma.account.create).mockResolvedValue({ id: "acc-3", provider: "GOOGLE" } as any);
        vi.mocked(prisma.session.create).mockResolvedValue(mockSession({ refreshTokenHash: "pending" }));
        vi.mocked(prisma.session.update).mockResolvedValue(mockSession());

        const res = await request(app)
            .post(`${BASE}/login/google`)
            .send({ idToken: "google-id-token" });

        expect(res.status).toBe(200);
    });

    it("401 — invalid Google token", async () => {
        vi.mocked(googleClient.verifyIdToken).mockRejectedValue(new Error("Invalid token"));

        const res = await request(app)
            .post(`${BASE}/login/google`)
            .send({ idToken: "bad-google-token" });

        expect(res.status).toBe(401);
    });

    it("401 — Google token has no email in payload", async () => {
        vi.mocked(googleClient.verifyIdToken).mockResolvedValue({
            getPayload: () => ({ sub: "sub-no-email" }),
        } as any);

        const res = await request(app)
            .post(`${BASE}/login/google`)
            .send({ idToken: "no-email-token" });

        expect(res.status).toBe(401);
    });

    it("400 — validation: missing idToken", async () => {
        const res = await request(app).post(`${BASE}/login/google`).send({});
        expect(res.status).toBe(400);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// REFRESH TOKEN
// ══════════════════════════════════════════════════════════════════════════════

describe("POST /api/auth/refresh", () => {
    it("200 — rotates tokens and sets new cookies", async () => {
        const oldToken = makeRefreshCookie();

        vi.mocked(prisma.session.findUnique).mockResolvedValue(
            mockSession({ refreshTokenHash: `hashed::${oldToken}` })
        );
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser());
        vi.mocked(prisma.session.update).mockResolvedValue(mockSession());

        const res = await request(app)
            .post(`${BASE}/refresh`)
            .set("Cookie", [`refreshToken=${oldToken}`]);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.accessToken).toBeDefined();
    });

    it("401 — no refresh token cookie", async () => {
        const res = await request(app).post(`${BASE}/refresh`);
        expect(res.status).toBe(401);
    });

    it("401 — invalid JWT in cookie", async () => {
        const res = await request(app)
            .post(`${BASE}/refresh`)
            .set("Cookie", ["refreshToken=not.a.valid.jwt"]);
        expect(res.status).toBe(401);
    });

    it("401 — session expired (expiresAt in the past)", async () => {
        const oldToken = makeRefreshCookie();

        vi.mocked(prisma.session.findUnique).mockResolvedValue(
            mockSession({
                refreshTokenHash: `hashed::${oldToken}`,
                expiresAt: new Date(Date.now() - 1000),
            })
        );

        const res = await request(app)
            .post(`${BASE}/refresh`)
            .set("Cookie", [`refreshToken=${oldToken}`]);

        expect(res.status).toBe(401);
    });

    it("401 — bcrypt comparison fails (token was stolen or tampered)", async () => {
        const oldToken = makeRefreshCookie();

        vi.mocked(prisma.session.findUnique).mockResolvedValue(
            mockSession({ refreshTokenHash: "hashed::a-different-token" })
        );

        const res = await request(app)
            .post(`${BASE}/refresh`)
            .set("Cookie", [`refreshToken=${oldToken}`]);

        expect(res.status).toBe(401);
    });

    it("401 — session found but user deleted from DB", async () => {
        const oldToken = makeRefreshCookie();

        vi.mocked(prisma.session.findUnique).mockResolvedValue(
            mockSession({ refreshTokenHash: `hashed::${oldToken}` })
        );
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

        const res = await request(app)
            .post(`${BASE}/refresh`)
            .set("Cookie", [`refreshToken=${oldToken}`]);

        expect(res.status).toBe(401);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// LOGOUT
// ══════════════════════════════════════════════════════════════════════════════

describe("POST /api/auth/logout", () => {
    it("200 — deletes session and clears cookies", async () => {
        const token = makeRefreshCookie();

        vi.mocked(prisma.session.findUnique).mockResolvedValue(
            mockSession({ refreshTokenHash: `hashed::${token}` })
        );
        vi.mocked(prisma.session.delete).mockResolvedValue(mockSession());

        const res = await request(app)
            .post(`${BASE}/logout`)
            .set("Cookie", [`refreshToken=${token}`]);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const cookies = res.headers["set-cookie"] as unknown as string[];
        expect(cookies.some((c: string) => c.includes("accessToken=;"))).toBe(true);
    });

    it("200 — graceful logout with no cookie (no session to delete)", async () => {
        const res = await request(app).post(`${BASE}/logout`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("200 — graceful logout when JWT is invalid (token already expired)", async () => {
        const res = await request(app)
            .post(`${BASE}/logout`)
            .set("Cookie", ["refreshToken=invalid.jwt.here"]);
        expect(res.status).toBe(200);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD
// ══════════════════════════════════════════════════════════════════════════════

describe("POST /api/auth/forgot-password", () => {
    it("200 — sends reset email for a known local user", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser());
        vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(null);
        vi.mocked(prisma.passwordResetToken.create).mockResolvedValue(mockPasswordResetToken());

        const res = await request(app)
            .post(`${BASE}/forgot-password`)
            .send({ email: "john@example.com" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("200 — same response when email not registered (no enumeration)", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

        const res = await request(app)
            .post(`${BASE}/forgot-password`)
            .send({ email: "nobody@example.com" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("400 — OAuth user (no password to reset)", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser({ passwordHash: null }));

        const res = await request(app)
            .post(`${BASE}/forgot-password`)
            .send({ email: "john@example.com" });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain("OAuth");
    });

    it("400 — validation: invalid email", async () => {
        const res = await request(app)
            .post(`${BASE}/forgot-password`)
            .send({ email: "invalid" });
        expect(res.status).toBe(400);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// RESET PASSWORD
// ══════════════════════════════════════════════════════════════════════════════

describe("POST /api/auth/reset-password", () => {
    const valid = { token: "valid-reset-token", password: "NewSecure@456" };

    it("200 — resets password for a valid unexpired token", async () => {
        vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(mockPasswordResetToken());
        vi.mocked(prisma.user.update).mockResolvedValue(mockUser());
        vi.mocked(prisma.passwordResetToken.delete).mockResolvedValue(mockPasswordResetToken());

        const res = await request(app).post(`${BASE}/reset-password`).send(valid);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("400 — invalid token (not in DB)", async () => {
        vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(null);

        const res = await request(app).post(`${BASE}/reset-password`).send(valid);
        expect(res.status).toBe(400);
    });

    it("400 — expired token", async () => {
        vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(
            mockPasswordResetToken({ expiresAt: new Date(Date.now() - 1000) })
        );
        vi.mocked(prisma.passwordResetToken.delete).mockResolvedValue(mockPasswordResetToken());

        const res = await request(app).post(`${BASE}/reset-password`).send(valid);
        expect(res.status).toBe(400);
        expect(res.body.message).toContain("expired");
    });

    it("400 — validation: weak new password", async () => {
        const res = await request(app)
            .post(`${BASE}/reset-password`)
            .send({ token: "t", password: "weak" });
        expect(res.status).toBe(400);
    });

    it("400 — validation: missing token", async () => {
        const res = await request(app)
            .post(`${BASE}/reset-password`)
            .send({ password: "NewSecure@456" });
        expect(res.status).toBe(400);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// PROTECTED ROUTES — auth middleware enforcement
// ══════════════════════════════════════════════════════════════════════════════

describe("Auth middleware enforcement", () => {
    it("401 — GET /me with no Authorization header", async () => {
        const res = await request(app).get(`${BASE}/me`);
        expect(res.status).toBe(401);
    });

    it("403 — GET /me with tampered access token", async () => {
        const res = await request(app)
            .get(`${BASE}/me`)
            .set("Authorization", "Bearer bad.token.here");
        expect(res.status).toBe(403);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET CURRENT USER (protected)
// ══════════════════════════════════════════════════════════════════════════════

describe("GET /api/auth/me", () => {
    it("200 — returns profile for authenticated user", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser());

        const res = await request(app)
            .get(`${BASE}/me`)
            .set("Authorization", authHeader());

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe("john@example.com");
        expect(res.body.user.emailVerified).toBe(true);
    });

    it("404 — user deleted between token issue and request", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

        const res = await request(app)
            .get(`${BASE}/me`)
            .set("Authorization", authHeader());

        expect(res.status).toBe(404);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// UPDATE PROFILE (protected)
// ══════════════════════════════════════════════════════════════════════════════

describe("PATCH /api/auth/profile", () => {
    it("200 — updates display name", async () => {
        vi.mocked(prisma.user.update).mockResolvedValue(mockUser({ name: "Updated Name" }));

        const res = await request(app)
            .patch(`${BASE}/profile`)
            .set("Authorization", authHeader())
            .send({ name: "Updated Name" });

        expect(res.status).toBe(200);
        expect(res.body.user.name).toBe("Updated Name");
    });

    it("401 — no auth", async () => {
        const res = await request(app).patch(`${BASE}/profile`).send({ name: "X" });
        expect(res.status).toBe(401);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// GENERATE AVATAR UPLOAD URL (protected)
// ══════════════════════════════════════════════════════════════════════════════

describe("POST /api/auth/avatar/upload-url", () => {
    it("200 — returns presigned URL and fileKey", async () => {
        vi.mocked(generateUploadPresignedUrl).mockResolvedValue({
            uploadUrl: "https://s3.amazonaws.com/test-bucket/users/user-123/uuid.jpg?sig=xxx",
            fileKey: "users/user-123/uuid.jpg",
            expiresIn: 300,
        });

        const res = await request(app)
            .post(`${BASE}/avatar/upload-url`)
            .set("Authorization", authHeader())
            .send({ fileName: "avatar.jpg", contentType: "image/jpeg" });

        expect(res.status).toBe(200);
        expect(res.body.uploadUrl).toContain("https://s3");
        expect(res.body.fileKey).toMatch(/^users\/user-123\//);
        expect(res.body.expiresIn).toBe(300);
    });

    it("400 — invalid content type (rejected by Zod enum before hitting service)", async () => {
        const res = await request(app)
            .post(`${BASE}/avatar/upload-url`)
            .set("Authorization", authHeader())
            .send({ fileName: "avatar.gif", contentType: "image/gif" });

        expect(res.status).toBe(400);
    });

    it("401 — no auth", async () => {
        const res = await request(app)
            .post(`${BASE}/avatar/upload-url`)
            .send({ fileName: "a.jpg", contentType: "image/jpeg" });
        expect(res.status).toBe(401);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// CONFIRM AVATAR UPLOAD (protected)
// ══════════════════════════════════════════════════════════════════════════════

describe("PATCH /api/auth/avatar", () => {
    const validKey = "users/user-123/550e8400-uuid.jpg";

    it("200 — confirms upload and updates profile image", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser());
        vi.mocked(checkObjectExists).mockResolvedValue(true);
        vi.mocked(prisma.user.update).mockResolvedValue(mockUser({ profileImage: validKey }));

        const res = await request(app)
            .patch(`${BASE}/avatar`)
            .set("Authorization", authHeader())
            .send({ fileKey: validKey });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("403 — fileKey does not belong to this user", async () => {
        const res = await request(app)
            .patch(`${BASE}/avatar`)
            .set("Authorization", authHeader())
            .send({ fileKey: "users/other-user-456/photo.jpg" });

        expect(res.status).toBe(403);
    });

    it("400 — file not found in S3", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser());
        vi.mocked(checkObjectExists).mockResolvedValue(false);

        const res = await request(app)
            .patch(`${BASE}/avatar`)
            .set("Authorization", authHeader())
            .send({ fileKey: validKey });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain("not found");
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET ACTIVE SESSIONS (protected)
// ══════════════════════════════════════════════════════════════════════════════

describe("GET /api/auth/sessions", () => {
    it("200 — returns list of active sessions", async () => {
        vi.mocked(prisma.session.findMany).mockResolvedValue([
            mockSession({ id: "s1" }),
            mockSession({ id: "s2" }),
        ]);

        const res = await request(app)
            .get(`${BASE}/sessions`)
            .set("Authorization", authHeader());

        expect(res.status).toBe(200);
        expect(res.body.sessions).toHaveLength(2);
        expect(res.body.sessions[0].id).toBe("s1");
        // Sensitive field not exposed
        expect(res.body.sessions[0].refreshTokenHash).toBeUndefined();
    });

    it("200 — returns empty array when no active sessions", async () => {
        vi.mocked(prisma.session.findMany).mockResolvedValue([]);

        const res = await request(app)
            .get(`${BASE}/sessions`)
            .set("Authorization", authHeader());

        expect(res.status).toBe(200);
        expect(res.body.sessions).toHaveLength(0);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// LOGOUT SPECIFIC SESSION (protected)
// ══════════════════════════════════════════════════════════════════════════════

describe("DELETE /api/auth/sessions/:sessionId", () => {
    it("200 — deletes a session owned by the current user", async () => {
        vi.mocked(prisma.session.findUnique).mockResolvedValue(
            mockSession({ id: "session-123", userId: "user-123" })
        );
        vi.mocked(prisma.session.delete).mockResolvedValue(mockSession());

        const res = await request(app)
            .delete(`${BASE}/sessions/session-123`)
            .set("Authorization", authHeader());

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("404 — session does not exist", async () => {
        vi.mocked(prisma.session.findUnique).mockResolvedValue(null);

        const res = await request(app)
            .delete(`${BASE}/sessions/ghost-session`)
            .set("Authorization", authHeader());

        expect(res.status).toBe(404);
    });

    it("403 — session belongs to a different user", async () => {
        vi.mocked(prisma.session.findUnique).mockResolvedValue(
            mockSession({ id: "session-999", userId: "other-user-456" })
        );

        const res = await request(app)
            .delete(`${BASE}/sessions/session-999`)
            .set("Authorization", authHeader());

        expect(res.status).toBe(403);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// LOGOUT ALL DEVICES (protected)
// ══════════════════════════════════════════════════════════════════════════════

describe("DELETE /api/auth/sessions", () => {
    it("200 — deletes all sessions and clears cookies", async () => {
        vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 3 });

        const res = await request(app)
            .delete(`${BASE}/sessions`)
            .set("Authorization", authHeader());

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("401 — no auth header", async () => {
        const res = await request(app).delete(`${BASE}/sessions`);
        expect(res.status).toBe(401);
    });
});
