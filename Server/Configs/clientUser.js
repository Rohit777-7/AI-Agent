// The user as the owner's browser may see it: never the Gemini key itself,
// only whether one is saved and its last four characters.
export const toClientUser = (user) => {
  if (!user) return user;

  const plain = typeof user.toObject === "function" ? user.toObject() : { ...user };
  const key = plain.geminiApiKey || "";

  delete plain.geminiApiKey;

  return {
    ...plain,
    hasGeminiKey: Boolean(key),
    geminiKeyHint: key ? key.slice(-4) : "",
  };
};

const isProduction = Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";

// Secure cookies only work over HTTPS, so local http development keeps them off.
export const authCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict",
  path: "/",
};
