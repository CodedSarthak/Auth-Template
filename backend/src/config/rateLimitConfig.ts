
import { RateLimiterRedis } from "rate-limiter-flexible";
import { redis } from "./redis.js";
import { RateLimiterMemory } from "rate-limiter-flexible";

export interface RateLimitConfig {
    points: number;           // Number of requests allowed
    duration: number;         // Time window in seconds
    blockDuration: number;    // How long to block after limit exceeded
    keyPrefix: string;        // Redis key prefix
}

const insuranceLimiter = new RateLimiterMemory({ // If Redis temporarily fails, the in-memory limiter takes over instead of completely disabling protection.
    points: 100,
    duration: 60,
});

export const createRateLimiter = ({
    points,
    duration,
    blockDuration,
    keyPrefix,
}: RateLimitConfig) =>
    new RateLimiterRedis({
        storeClient: redis,
        insuranceLimiter,
        points,
        duration,
        blockDuration,
        keyPrefix,
    });