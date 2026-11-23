import express from "express";
import { isAuth } from "../Middleware/isAuth.js";
import { rateLimit } from "../Middleware/rateLimit.js";
import {
  createOrder,
  verifyBilling,
} from "../Controllers/billing.controller.js";

const billingRouter = express.Router();

billingRouter.post(
  "/order",
  isAuth,
  rateLimit({ name: "billing-order", limit: 10, windowMs: 10 * 60 * 1000 }),
  createOrder,
);
billingRouter.post(
  "/verify",
  isAuth,
  rateLimit({ name: "billing-verify", limit: 20, windowMs: 10 * 60 * 1000 }),
  verifyBilling,
);

export default billingRouter;
