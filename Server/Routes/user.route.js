import express from "express";
import { getCurrentUser } from "../Controllers/user.controller.js";
import { isAuth } from "../Middleware/isAuth.js";
import { saveAssistant } from "../Controllers/user.controller.js";

const userRouter = express.Router();

userRouter.get("/current-user", isAuth, getCurrentUser);
userRouter.post("/save-assistant", isAuth, saveAssistant);

export default userRouter;