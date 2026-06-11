import { Redis } from "ioredis";

export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,

  retryStrategy(times) {
    const delay = Math.min(times * 100, 2000);
    return delay;
  },
});

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err);
});

redis.on("close", () => {
  console.warn("⚠️ Redis connection closed");
});