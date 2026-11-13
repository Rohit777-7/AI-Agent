import express from "express";
import dotenv from "dotenv";
import connectDB from "./configs/Connectdb.js";
import cookieParser from "cookie-parser";
import authRouter from "./Routes/auth.routes.js";
import userRouter from "./Routes/user.route.js";
import cors from "cors";
import assistantRouter from "./Routes/assistant.route.js";
import { askAssistant } from "./Controllers/assistant.controller.js";
import billingRouter from "./Routes/billing.route.js";
dotenv.config();

const app = express();

const privateCors =
  cors({

    origin: [
      "http://localhost:5173"
    ],

    credentials: true

  });

const publicCors =
  cors({
    origin: "*",
  });

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json("Hello from Server");
});



app.use("/api/auth", privateCors, authRouter);
app.use("/api/user", privateCors, userRouter);

app.use("/api/billing", privateCors, billingRouter);
app.use("/api/assistant", publicCors, assistantRouter);


// const PORT = process.env.PORT;

// app.listen(PORT, () => {
//   console.log(`Server Started on Port ${PORT}`);
//   connectDB();
// });
console.log("PORT =", process.env.PORT);
app.listen(8000, () => {
  console.log("Server Started on Port 8000");
    connectDB();
});