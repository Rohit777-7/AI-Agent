import jwt from "jsonwebtoken";

// Public project ID from the client's Firebase config; override with FIREBASE_PROJECT_ID.
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "shifraai-cbeb3";

const GOOGLE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let certCache = { certs: null, expiresAt: 0 };

// Google's signing certificates, cached for as long as Google's Cache-Control allows.
export const getGoogleCerts = async () => {
  if (certCache.certs && Date.now() < certCache.expiresAt) {
    return certCache.certs;
  }

  const response = await fetch(GOOGLE_CERTS_URL);

  if (!response.ok) {
    throw new Error(`Could not fetch Google signing certificates (${response.status})`);
  }

  const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get("cache-control") || "")?.[1] || 3600);
  certCache = { certs: await response.json(), expiresAt: Date.now() + maxAge * 1000 };

  return certCache.certs;
};

export class InvalidIdTokenError extends Error {}

// Verifies a Firebase ID token the way the Firebase Admin SDK does: RS256
// signature from Google, this project's audience and issuer, not expired, and
// a verified email. Returns the trusted claims.
export const verifyFirebaseIdToken = async (idToken, { getCerts = getGoogleCerts } = {}) => {
  if (typeof idToken !== "string" || idToken.split(".").length !== 3) {
    throw new InvalidIdTokenError("Missing or malformed ID token");
  }

  const decoded = jwt.decode(idToken, { complete: true });
  const kid = decoded?.header?.kid;

  if (!kid || decoded.header.alg !== "RS256") {
    throw new InvalidIdTokenError("Unexpected token header");
  }

  const certs = await getCerts();
  const cert = certs[kid];

  if (!cert) {
    throw new InvalidIdTokenError("Token signed with an unknown key");
  }

  let claims;

  try {
    claims = jwt.verify(idToken, cert, {
      algorithms: ["RS256"],
      audience: FIREBASE_PROJECT_ID,
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
    });
  } catch (error) {
    throw new InvalidIdTokenError(error.message);
  }

  if (typeof claims.sub !== "string" || !claims.sub) {
    throw new InvalidIdTokenError("Token has no subject");
  }

  if (typeof claims.email !== "string" || claims.email_verified !== true) {
    throw new InvalidIdTokenError("Email is missing or not verified");
  }

  return claims;
};
