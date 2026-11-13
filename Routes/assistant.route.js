import express from "express";
import { getAssistantConfig,askAssistant} from "../Controllers/assistant.controller.js";

const assistantRouter = express.Router();

assistantRouter.get("/assistant/:userId", getAssistantConfig);
assistantRouter.post("/ask", askAssistant);

export default assistantRouter;