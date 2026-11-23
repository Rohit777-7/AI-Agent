import { genToken } from "../Configs/token.js";
import User from "../Models/user.model.js";
import { verifyFirebaseIdToken, InvalidIdTokenError } from "../Configs/firebaseAuth.js";
import { toClientUser, authCookieOptions } from "../Configs/clientUser.js";

const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 1 day, matches the JWT expiry

// The browser sends the Firebase ID token from Google sign-in. Identity comes
// only from the verified token, never from fields the client chooses.
export const googleAuth = async (req, res) => {
    try {
        const { idToken } = req.body || {};

        let claims;

        try {
            claims = await verifyFirebaseIdToken(idToken);
        } catch (error) {
            if (error instanceof InvalidIdTokenError) {
                return res.status(401).json({ message: "Sign-in could not be verified. Please try again." });
            }
            throw error;
        }

        const email = claims.email.toLowerCase();
        const name = (typeof claims.name === "string" && claims.name.trim()) || email.split("@")[0];

        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({ name: name.slice(0, 100), email });
        }

        const token = genToken(user._id);

        res.cookie("token", token, { ...authCookieOptions, maxAge: SESSION_MAX_AGE });

        return res.status(200).json({ message: "Google authentication successful", user: toClientUser(user) });
    } catch (error) {
        console.error("Google authentication failed:", error.message);
        return res.status(500).json({ message: "Google authentication failed" });
    }
};

export const logout = (req, res) => {
    try {
        res.clearCookie("token", authCookieOptions);
        return res.status(200).json({ message: "Logout successful" });
    } catch (error) {
        return res.status(500).json({ message: "Logout failed" });
    }
};
