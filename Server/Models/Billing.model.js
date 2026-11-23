import mongoose from "mongoose";

const billingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    amount: Number,

    plan: String,

    // Each Razorpay order and payment can be recorded only once.
    paymentId: {
      type: String,
      unique: true,
      sparse: true,
    },

    orderId: {
      type: String,
      unique: true,
    },

    status: {
      type: String,

      enum: [
        "created",
        "paid",
        "failed",
      ],

      default: "created",
    },
  },
  {
    timestamps: true,
  }
);

const Billing = mongoose.model("Billing", billingSchema);

export default Billing;