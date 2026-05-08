const Redis = require("ioredis");

const host = process.env.REDIS_HOST;
const port = parseInt(process.env.REDIS_PORT);
const password = process.env.REDIS_PASSWORD || undefined;

// Debug — will show exactly what values are being read
console.log("Redis config:", { host, port, password: password ? "set" : "not set" });

if (!host || isNaN(port)) {
  console.error("❌ REDIS_HOST or REDIS_PORT is missing from .env");
  process.exit(1);
}

const redis = new Redis({
  host,
  port,
  password,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 200, 1000);
  }
});

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", err => console.error("❌ Redis error:", err.message));

module.exports = redis;