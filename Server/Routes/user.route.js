import express from "express";
import { getCurrentUser, saveAssistant } from "../Controllers/user.controller.js";
import { isAuth } from "../Middleware/isAuth.js";
import { rateLimit } from "../Middleware/rateLimit.js";

const userRouter = express.Router();

userRouter.get("/current-user", isAuth, getCurrentUser);
userRouter.post(
  "/save-assistant",
  isAuth,
  rateLimit({ name: "save-assistant", limit: 30, windowMs: 60 * 1000 }),
  saveAssistant,
);

export default userRouter;
