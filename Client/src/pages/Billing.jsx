import {React,useEffect} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  FiCheck,
  FiStar,
  FiLock,
  FiMinus,
  FiPlus,
  FiShield,
  FiClock,
  FiRefreshCw,
} from "react-icons/fi";
import { ServerUrl } from "../App";

const ASSURANCES = [
  {
    icon: FiShield,
    title: "Secure checkout",
    desc: "Payments are processed by Razorpay.",
  },
  {
    icon: FiClock,
    title: "Instant upgrade",
    desc: "Pro unlocks as soon as payment is verified.",
  },
  {
    icon: FiRefreshCw,
    title: "No auto-renewal",
    desc: "A one-time payment for 3 months of Pro.",
  },
];

// [feature, free, pro]: true = included, false = not included, string = value
const COMPARISON = [
  ["AI messages", "200", "Unlimited"],
  ["Voice assistant", true, true],
  ["Voice navigation", true, "Unlimited"],
  ["Widget themes", "8", "8"],
  ["Advanced AI assistant", false, true],
  ["Priority performance", false, true],
  ["Premium support", false, true],
];

const FAQS = [
  {
    q: "How long does Pro last?",
    a: "Pro lasts 3 months (90 days) from the moment your payment is verified. It is a one-time payment and does not renew automatically.",
  },
  {
    q: "What happens when my free messages run out?",
    a: "Once you have used all 200 free AI replies, your assistant answers with a limit message instead of an AI reply. Upgrading to Pro removes the limit.",
  },
  {
    q: "What happens when Pro ends?",
    a: "Your account returns to the Free plan. Your assistant, its settings and your navigation pages stay exactly as they are.",
  },
  {
    q: "Do I need my own Gemini API key?",
    a: "Yes. Your assistant's replies are generated with your own Gemini API key, which you add in the Builder. You can create one for free in Google AI Studio.",
  },
  {
    q: "Is my payment secure?",
    a: "Checkout is handled by Razorpay, and your card details are entered on Razorpay's secure form, not stored by ShifraAI.",
  },
];

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
      <div className="absolute -top-40 right-1/4 w-[520px] h-[420px] rounded-full bg-gold-200/50 blur-[140px] pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold-600">
            Billing
          </p>
          <h1 className="mt-3 font-display text-5xl sm:text-6xl leading-[1.02] tracking-[-0.015em] text-stone-950">
            Billing & Subscription
          </h1>

          <p className="text-stone-600 mt-2">
            Manage your billing and subscription details
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10">
          <div className="surface p-5">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500">
              Current Plan
            </p>

            <p className="text-xl font-semibold text-stone-950 mt-2 capitalize">
              {user?.plan}
            </p>
          </div>

          <div className="surface p-5">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500">
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
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500">
              {isPro ? "Plan Expiry" : "Messages Left"}
            </p>

            <p className="text-xl font-semibold text-stone-950 mt-2">
              {isPro ? `${remainingDays} Days` : remainingMessages}
              {!isPro && (
                <span className="text-sm font-normal text-stone-500">
                  {" "}
                  / {user?.requestLimit}
                </span>
              )}
            </p>

            {!isPro && (
              <div className="mt-3 h-1.5 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-500"
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
              <h2 className="font-display text-3xl text-stone-950">Free Plan</h2>
              {!isPro && (
                <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-700">
                  Current
                </span>
              )}
            </div>

            <p className="mt-6 flex items-baseline gap-2">
              <span className="font-display text-6xl tracking-tight text-stone-950">
                ₹0
              </span>
              <span className="text-sm text-stone-500">forever</span>
            </p>

            <ul className="mt-8 space-y-3.5 text-sm text-stone-700 flex-1">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <FiCheck className="text-stone-500 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <button disabled className="btn-ghost mt-8 h-12 w-full">
              {isPro ? "Included" : "Your current plan"}
            </button>
          </div>

          {/* Pro */}
          <div className="relative rounded-[25px] p-px bg-gradient-to-b from-gold-300 via-gold-100 to-gold-500 shadow-[0_30px_80px_-30px_rgba(149,116,66,0.55)]">
            <div className="relative h-full rounded-3xl bg-ink p-8 flex flex-col overflow-hidden">
              <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-gold-500/25 blur-[90px]" />

              <div className="relative flex items-center justify-between">
                <h2 className="font-display text-3xl text-gold-50">Pro Plan</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-gold-200 to-gold-400 px-2.5 py-1 text-xs font-semibold text-ink">
                  <FiStar size={12} />
                  {isPro ? "Active" : "Recommended"}
                </span>
              </div>

              <p className="relative mt-6 flex items-baseline gap-2">
                <span className="font-display text-6xl tracking-tight text-gold-200">
                  ₹699
                </span>
                <span className="text-sm text-stone-400">/ 3 months</span>
              </p>

              <ul className="relative mt-8 space-y-3.5 text-sm text-stone-200 flex-1">
                {PRO_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <span className="w-5 h-5 shrink-0 rounded-full bg-gold-400/15 text-gold-300 flex items-center justify-center">
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

              <p className="relative mt-4 flex items-center justify-center gap-1.5 text-xs text-stone-400">
                <FiLock size={12} />
                Secure payment via Razorpay
              </p>
            </div>
          </div>
        </div>

        {/* Assurances */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ASSURANCES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-2xl border border-gold-200/70 bg-gold-50/60 px-5 py-4"
            >
              <Icon className="mt-0.5 shrink-0 text-gold-600" size={16} />
              <div>
                <p className="text-sm font-semibold text-stone-900">{title}</p>
                <p className="text-xs leading-5 text-stone-600 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Compare */}
        <section className="mt-20">
          <div className="flex items-center gap-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold-600">
              Compare
            </p>
            <div className="h-px flex-1 bg-gradient-to-r from-gold-300/70 to-transparent" />
          </div>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl tracking-[-0.015em] text-stone-950">
            Everything, side by <span className="italic text-gradient">side.</span>
          </h2>

          <div className="surface mt-8 overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gold-200/70 bg-gold-50/60">
                  <th className="px-6 py-4 text-left font-medium text-stone-500">Feature</th>
                  <th className="px-6 py-4 text-center font-semibold text-stone-900 w-32">Free</th>
                  <th className="px-6 py-4 text-center font-semibold text-gold-700 w-32">Pro</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(([feature, free, pro]) => (
                  <tr key={feature} className="border-b border-gold-100 last:border-0">
                    <td className="px-6 py-4 text-stone-800">{feature}</td>
                    {[free, pro].map((value, i) => (
                      <td key={i} className="px-6 py-4 text-center">
                        {value === true ? (
                          <FiCheck className={`inline ${i ? "text-gold-600" : "text-stone-500"}`} />
                        ) : value === false ? (
                          <FiMinus className="inline text-stone-300" />
                        ) : (
                          <span className={i ? "font-semibold text-gold-700" : "text-stone-600"}>{value}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-20">
          <div className="flex items-center gap-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold-600">
              Questions
            </p>
            <div className="h-px flex-1 bg-gradient-to-r from-gold-300/70 to-transparent" />
          </div>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl tracking-[-0.015em] text-stone-950">
            Good to <span className="italic text-gradient">know.</span>
          </h2>

          <div className="mt-8 divide-y divide-gold-200/70 border-y border-gold-200/70">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-medium text-stone-900 [&::-webkit-details-marker]:hidden">
                  {q}
                  <FiPlus className="shrink-0 text-gold-600 transition-transform duration-300 group-open:rotate-45" />
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Billing;
