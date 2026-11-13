import {React,useEffect} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FiCheck, FiStar, FiLock } from "react-icons/fi";
import { ServerUrl } from "../App";

const FREE_FEATURES = [
  "200 AI messages",
  "Voice assistant",
  "Navigation support",
  "Basic customization",
];

const PRO_FEATURES = [
  "Unlimited AI messages",
  "Advanced AI assistant",
  "Priority performance",
  "Unlimited navigation",
  "Premium support",
];

const STATUS_STYLES = {
  active: { dot: "bg-emerald-400", text: "text-emerald-600" },
  invalid: { dot: "bg-rose-400", text: "text-rose-600" },
};

function Billing({ user, setUser }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !user.isSetupComplete) {
      toast.error("Setup your assistant first");

      navigate("/builder");
    }
  }, []);

  const remainingMessages = Math.max(
    0,
    (user?.requestLimit || 0) - (user?.totalMessages || 0),
  );

  const remainingDays = user?.proExpiresAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(user.proExpiresAt) - new Date()) / (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  const handlePay = async () => {
    try {
      const res = await axios.post(
        ServerUrl + "/api/billing/order",
        { plan: "pro" },
        { withCredentials: true },
      );

      const order = res.data.order;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,

        amount: order.amount,

        currency: order.currency,

        name: "ShifraAI",

        description: "Pro Plan",

        order_id: order.id,

        handler: async (response) => {
          const verifyRes = await axios.post(
            ServerUrl + "/api/billing/verify",
            response,
            { withCredentials: true },
          );

          if (verifyRes.data.success) {
            toast.success("Payment successfully");

            setUser(verifyRes.data.user);
          }
        },

        theme: {
          color: "#7c3aed",
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.open();
    } catch (error) {
      toast.error("Payment Failed");
      console.log(error);
    }
  };
  const status = STATUS_STYLES[user?.geminiStatus] || {
    dot: "bg-amber-400",
    text: "text-amber-600",
  };

  const usedPercent = user?.requestLimit
    ? Math.min(100, ((user?.totalMessages || 0) / user.requestLimit) * 100)
    : 0;

  const isPro = user?.plan === "pro";

  return (
    <div className="relative min-h-screen bg-canvas pt-16">
      <div className="absolute inset-x-0 top-0 h-[420px] bg-grid pointer-events-none" />
      <div className="absolute -top-40 right-1/4 w-[520px] h-[420px] rounded-full bg-violet-600/15 blur-[140px] pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-600">
            Billing
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-zinc-950">
            Billing & Subscription
          </h1>

          <p className="text-zinc-600 mt-2">
            Manage your billing and subscription details
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10">
          <div className="surface p-5">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
              Current Plan
            </p>

            <p className="text-xl font-semibold text-zinc-950 mt-2 capitalize">
              {user?.plan}
            </p>
          </div>

          <div className="surface p-5">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
              Gemini Status
            </p>

            <p
              className={`inline-flex items-center gap-2 text-xl font-semibold mt-2 capitalize ${status.text}`}
            >
              <span className={`w-2 h-2 rounded-full ${status.dot}`} />
              {user?.geminiStatus}
            </p>
          </div>

          <div className="surface p-5">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
              {isPro ? "Plan Expiry" : "Messages Left"}
            </p>

            <p className="text-xl font-semibold text-zinc-950 mt-2">
              {isPro ? `${remainingDays} Days` : remainingMessages}
              {!isPro && (
                <span className="text-sm font-normal text-zinc-500">
                  {" "}
                  / {user?.requestLimit}
                </span>
              )}
            </p>

            {!isPro && (
              <div className="mt-3 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-emerald-400"
                  style={{ width: `${100 - usedPercent}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-12 items-stretch">
          {/* Free */}
          <div className="surface p-8 flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-950">Free Plan</h2>
              {!isPro && (
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700">
                  Current
                </span>
              )}
            </div>

            <p className="mt-6 flex items-baseline gap-2">
              <span className="text-5xl font-semibold tracking-tight text-zinc-950">
                ₹0
              </span>
              <span className="text-sm text-zinc-500">forever</span>
            </p>

            <ul className="mt-8 space-y-3.5 text-sm text-zinc-700 flex-1">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <FiCheck className="text-zinc-500 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <button disabled className="btn-ghost mt-8 h-12 w-full">
              {isPro ? "Included" : "Your current plan"}
            </button>
          </div>

          {/* Pro */}
          <div className="relative rounded-[25px] p-px bg-gradient-to-b from-violet-400/70 via-zinc-200 to-emerald-400/60 shadow-[0_30px_100px_-30px_rgba(139,92,246,0.55)]">
            <div className="relative h-full rounded-3xl bg-white p-8 flex flex-col overflow-hidden">
              <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-violet-600/25 blur-[90px]" />

              <div className="relative flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-950">Pro Plan</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 px-2.5 py-1 text-xs font-semibold text-white">
                  <FiStar size={12} />
                  {isPro ? "Active" : "Recommended"}
                </span>
              </div>

              <p className="relative mt-6 flex items-baseline gap-2">
                <span className="text-5xl font-semibold tracking-tight text-zinc-950">
                  ₹699
                </span>
                <span className="text-sm text-zinc-600">/ 3 months</span>
              </p>

              <ul className="relative mt-8 space-y-3.5 text-sm text-zinc-800 flex-1">
                {PRO_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <span className="w-5 h-5 shrink-0 rounded-full bg-emerald-400/15 text-emerald-600 flex items-center justify-center">
                      <FiCheck size={12} />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={handlePay}
                disabled={isPro}
                className="btn-accent relative mt-8 h-12 w-full"
              >
                {isPro ? "Active Plan" : "Upgrade Now"}
              </button>

              <p className="relative mt-4 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
                <FiLock size={12} />
                Secure payment via Razorpay
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Billing;
