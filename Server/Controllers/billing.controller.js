import crypto from "crypto";
import User from "../Models/user.model.js";
import Billing from "../Models/Billing.model.js";
import { razorpay } from "../Configs/razorpay.js";
import { toClientUser } from "../Configs/clientUser.js";

const PLANS = {
  pro: { amount: 699, days: 90 },
};

const DAY_MS = 24 * 60 * 60 * 1000;

const isValidSignature = (orderId, paymentId, signature) => {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === signatureBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  );
};

export const createOrder = async (req, res) => {
  try {
    const { plan } = req.body || {};

    if (typeof plan !== "string" || !Object.hasOwn(PLANS, plan)) {
      return res.status(400).json({ success: false, message: "Unknown plan" });
    }

    const { amount } = PLANS[plan];

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: { userId: req.userId, plan },
    });

    await Billing.create({
      userId: req.userId,
      amount,
      plan,
      orderId: order.id,
    });

    return res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Order creation failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Order creation failed",
    });
  }
};

export const verifyBilling = async (req, res) => {
  try {
    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = req.body || {};

    const fields = [orderId, paymentId, signature];

    if (!fields.every((value) => typeof value === "string" && value.length > 0 && value.length < 200)) {
      return res.status(400).json({ success: false, message: "Invalid payment details" });
    }

    if (!isValidSignature(orderId, paymentId, signature)) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    // Claim the order exactly once, and only for the account that created it,
    // so one payment can never upgrade a second account.
    const billing = await Billing.findOneAndUpdate(
      { orderId, userId: req.userId, status: "created" },
      { $set: { status: "paid", paymentId } },
      { returnDocument: "after" },
    );

    if (!billing) {
      return res.status(409).json({
        success: false,
        message: "This payment has already been used or belongs to another account.",
      });
    }

    const { days } = PLANS[billing.plan] || PLANS.pro;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Buying again while Pro is active extends it instead of resetting it.
    const stillActive =
      user.plan === "pro" && user.proExpiresAt && new Date(user.proExpiresAt) > new Date();
    const startsAt = stillActive ? new Date(user.proExpiresAt).getTime() : Date.now();

    user.plan = "pro";
    user.proExpiresAt = new Date(startsAt + days * DAY_MS);
    await user.save();

    return res.json({
      success: true,
      user: toClientUser(user),
    });
  } catch (error) {
    console.error("Payment verification failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
    });
  }
};
