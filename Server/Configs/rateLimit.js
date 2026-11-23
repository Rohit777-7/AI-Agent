import RateLimit from "../Models/RateLimit.model.js";

// Counts a hit for `key` in the current fixed window. Stored in MongoDB so the
// limit holds across serverless instances. Returns whether the hit is allowed.
export const consumeRateLimit = async (key, limit, windowMs) => {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const bucketKey = `${key}:${windowStart}`;
  const expiresAt = new Date(windowStart + windowMs * 2);

  const update = () =>
    RateLimit.findOneAndUpdate(
      { key: bucketKey },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true, returnDocument: "after" },
    );

  let doc;

  try {
    doc = await update();
  } catch (error) {
    // Two first hits racing on the same new bucket: the loser retries once.
    if (error?.code !== 11000) throw error;
    doc = await update();
  }

  return {
    allowed: doc.count <= limit,
    remaining: Math.max(0, limit - doc.count),
    retryAfterSeconds: Math.ceil((windowStart + windowMs - now) / 1000),
  };
};

// The visitor's IP: the first address in x-forwarded-for (set by Vercel and
// kept when the client project proxies /api), else the socket address.
export const getClientIp = (req) =>
  (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
  req.socket?.remoteAddress ||
  "unknown";
