// import express from "express";
// import dotenv from "dotenv";
// import connectDB from "./configs/Connectdb.js";
// import cookieParser from "cookie-parser";
// import authRouter from "./Routes/auth.routes.js";
// import userRouter from "./Routes/user.route.js";
// import cors from "cors";
// import assistantRouter from "./Routes/assistant.route.js";
// import { askAssistant } from "./Controllers/assistant.controller.js";
// import billingRouter from "./Routes/billing.route.js";
// dotenv.config();

// const app = express();

// const privateCors =
//   cors({

//     origin: [
//       "http://localhost:5173"
//     ],

//     credentials: true

//   });

// const publicCors =
//   cors({
//     origin: "*",
//   });

// app.use(express.json());
// app.use(cookieParser());

// app.get("/", (req, res) => {
//   res.json("Hello from Server");
// });



// app.use("/api/auth", privateCors, authRouter);
// app.use("/api/user", privateCors, userRouter);

// app.use("/api/billing", privateCors, billingRouter);
// app.use("/api/assistant", publicCors, assistantRouter);


// // const PORT = process.env.PORT;

// // app.listen(PORT, () => {
// //   console.log(`Server Started on Port ${PORT}`);
// //   connectDB();
// // });
// console.log("PORT =", process.env.PORT);
// app.listen(8000, () => {
//   console.log("Server Started on Port 8000");
//     connectDB();
// });



import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import Connectdb from "./configs/Connectdb.js";

import authRouter from "./Routes/auth.routes.js";
import userRouter from "./Routes/user.route.js";
import assistantRouter from "./Routes/assistant.route.js";
import billingRouter from "./Routes/billing.route.js";

dotenv.config();

const app = express();

// CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_URL
].filter(Boolean);

const privateCors = cors({
  origin: allowedOrigins,
  credentials: true
});

const publicCors = cors({
  origin: "*"
});

// Middleware
app.use(express.json());
app.use(cookieParser());

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AI Agent Server is running"
  });
});

// API Routes
app.use("/api/auth", privateCors, authRouter);
app.use("/api/user", privateCors, userRouter);
app.use("/api/billing", privateCors, billingRouter);
app.use("/api/assistant", publicCors, assistantRouter);

// Export Express app for Vercel
export default app;

// Local development
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 8000;

  Connectdb()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error("Server startup failed:", error);
      process.exit(1);
    });
}
