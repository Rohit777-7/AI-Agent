import jwt from "jsonwebtoken";

const unauthorized = (res) =>
  res.status(401).json({ message: "Please sign in again." });

export const isAuth = (req, res, next) => {
  const token = req.cookies?.token;

  if (typeof token !== "string" || !token) {
    return unauthorized(res);
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });

    if (typeof payload?.userId !== "string") {
      return unauthorized(res);
    }

    req.userId = payload.userId;
    return next();
  } catch {
    // Expired, tampered or malformed: same answer, no internal details.
    return unauthorized(res);
  }
};
