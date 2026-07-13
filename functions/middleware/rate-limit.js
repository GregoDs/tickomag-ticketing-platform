const crypto = require("crypto");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../services/firebase.service");

const DEFAULT_TTL_BUFFER_MS = 60 * 60 * 1000;

function normalizeIp(value = "") {
  return String(value)
    .trim()
    .replace(/^::ffff:/, "");
}

function getClientIp(req) {
  const forwardedFor = req.get("x-forwarded-for");

  if (forwardedFor) {
    const [clientIp] = forwardedFor.split(",");
    const normalized = normalizeIp(clientIp);
    if (normalized) return normalized;
  }

  return normalizeIp(
    req.ip ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    "unknown"
  );
}

function hashKey(value) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function createRateLimiter({
  name,
  limit,
  windowMs,
}) {
  if (!name || !limit || !windowMs) {
    throw new Error("Rate limiter requires name, limit and windowMs.");
  }

  return async function rateLimit(req, res, next) {
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const windowEnd = windowStart + windowMs;
    const retryAfter = Math.max(1, Math.ceil((windowEnd - now) / 1000));
    const clientIp = getClientIp(req);
    const keyHash = hashKey(`${name}:${clientIp}`);
    const rateLimitRef = db
      .collection("rateLimits")
      .doc(hashKey(`${keyHash}:${windowStart}`));

    try {
      const result = await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(rateLimitRef);
        const currentCount = snapshot.exists
          ? Number(snapshot.data().count || 0)
          : 0;

        if (currentCount >= limit) {
          return {
            allowed: false,
            remaining: 0,
          };
        }

        const expiresAt = new Date(windowEnd + DEFAULT_TTL_BUFFER_MS);

        if (snapshot.exists) {
          transaction.update(rateLimitRef, {
            count: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else {
          transaction.set(rateLimitRef, {
            name,
            keyHash,
            count: 1,
            limit,
            windowStart: new Date(windowStart),
            windowEnd: new Date(windowEnd),
            expiresAt,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        return {
          allowed: true,
          remaining: Math.max(0, limit - currentCount - 1),
        };
      });

      res.set("X-RateLimit-Limit", String(limit));
      res.set("X-RateLimit-Remaining", String(result.remaining));
      res.set("X-RateLimit-Reset", String(Math.ceil(windowEnd / 1000)));

      if (!result.allowed) {
        res.set("Retry-After", String(retryAfter));
        return res.status(429).json({
          success: false,
          message: "Too many requests. Try again later.",
        });
      }

      return next();
    } catch (error) {
      console.error(`Rate limiter failed for ${name}:`, error);

      return res.status(503).json({
        success: false,
        message: "Request protection is temporarily unavailable.",
      });
    }
  };
}

module.exports = {
  createRateLimiter,
  getClientIp,
};
