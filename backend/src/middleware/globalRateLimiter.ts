import { Request, Response, NextFunction } from "express";
import { createRateLimiter, RateLimitConfig } from "../config/rateLimitConfig.js";

const EXCLUDE_PATHS = ["/health", "/status", "/metrics"];

const globalLimiterConfig: RateLimitConfig = {
    points: Number(process.env.RATE_LIMIT_POINTS ?? 100),
    duration: Number(process.env.RATE_LIMIT_DURATION ?? 60),
    blockDuration: Number(process.env.RATE_LIMIT_BLOCK ?? 60),
    keyPrefix: "rl:global",
};

const globalRateLimiterInstance = createRateLimiter(globalLimiterConfig);

export const globalRateLimiter = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (EXCLUDE_PATHS.includes(req.path)) return next();

        // Use user ID if authenticated, otherwise use IP
        const key = req.user?.id ? `user:${req.user.id}` : req.ip ?? "unknown";

        const result = await globalRateLimiterInstance.consume(key);

        res.setHeader("X-RateLimit-Limit", globalLimiterConfig.points);
        res.setHeader("X-RateLimit-Remaining", result.remainingPoints);
        res.setHeader(
            "X-RateLimit-Reset",
            Math.ceil(Date.now() / 1000 + result.msBeforeNext / 1000)
        );

        next();
    }
    catch (err: unknown) {
        if (err instanceof Error) {
            console.error("Rate limiter error:", err.message);
            return next();
        }

        const rateLimiterRes = err as { msBeforeNext: number };
        const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000);

        res.setHeader("Retry-After", retryAfter);

        return res.status(429).json({
            success: false,
            message: "Too many requests. Please try again later.",
        });
    }
};