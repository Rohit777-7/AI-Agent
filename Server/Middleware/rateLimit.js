import { consumeRateLimit, getClientIp } from "../Configs/rateLimit.js";

// Express middleware: at most `limit` requests per `windowMs` for each key.
// The key is the signed-in user when known, otherwise the visitor's IP.
export const rateLimit = ({ name, limit, windowMs }) => async (req, res, next) => {
  try {
    const who = req.userId ? `user:${req.userId}` : `ip:${getClientIp(req)}`;
    const result = await consumeRateLimit(`${name}:${who}`, limit, windowMs);

    if (!result.allowed) {
      res.set("Retry-After", String(result.retryAfterSeconds));
      return res.status(429).json({ message: "Too many requests. Please wait a moment and try again." });
    }

    return next();
  } catch (error) {
    // If the limiter itself fails, don't lock everyone out.
    console.error("Rate limiter error:", error.message);
    return next();
  }
};
