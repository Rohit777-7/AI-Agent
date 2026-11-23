import express from "express";
import { googleAuth, logout } from "../Controllers/auth.controller.js";
import { rateLimit } from "../Middleware/rateLimit.js";

const authRouter = express.Router();

authRouter.post("/google", rateLimit({ name: "login", limit: 10, windowMs: 60 * 1000 }), googleAuth);

authRouter.post("/logout", logout);

export default authRouter;
