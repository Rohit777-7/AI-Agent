import React, { useState } from "react";
import axios from "axios";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../utils/firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ServerUrl } from "../App";

import { FiMic, FiCompass, FiCode, FiZap, FiCheck } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import logo from "../assets/logo-mark.png";

const FEATURES = [
  {
    icon: FiMic,
    title: "Voice AI",
    desc: "Natural, real-time voice conversations with your visitors.",
  },
  {
    icon: FiCompass,
    title: "Smart Navigation",
    desc: "Visitors say where they want to go and the page opens.",
  },
  {
    icon: FiCode,
    title: "Easy Embed",
    desc: "Add the assistant to any site with one script tag.",
  },
  {
    icon: FiZap,
    title: "Fast Responses",
    desc: "Short, optimised Gemini replies built for voice playback.",
  },
];

const PERKS = ["200 free AI responses", "No credit card required", "One-line install"];

function Login({ setUser }) {
  const navigate = useNavigate();
  const [signingIn, setSigningIn] = useState(false);

  const handleLogin = async () => {
    setSigningIn(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const { displayName, email } = result.user;
      const res = await axios.post(
        ServerUrl + "/api/auth/google",
        {
          name: displayName,
          email,
        },
        {
          withCredentials: true,
        },
      );
      setUser(res.data.user);
      navigate("/");
    } catch (error) {
      console.log(error);
      if (error?.code !== "auth/popup-closed-by-user") {
        toast.error("Sign in failed. Please try again.");
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute -top-40 left-1/4 w-[520px] h-[520px] rounded-full bg-gold-200/60 blur-[140px]" />
      <div className="absolute -bottom-40 right-1/4 w-[480px] h-[480px] rounded-full bg-gold-200/50 blur-[140px]" />

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Top bar */}
        <div className="h-20 flex items-center gap-2.5">
          <img src={logo} alt="" className="w-8 h-8 rounded-full shadow-[0_0_24px_-4px_rgba(176,141,87,0.55)]" />
          <span className="font-bold text-lg tracking-tight text-stone-950">
            Shifra <span className="text-gradient">AI</span>
          </span>
        </div>

        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-14 lg:gap-20 items-center py-10 lg:py-20">
          {/* Left */}
          <div>
            <span className="eyebrow">
              <span className="relative flex w-2 h-2">
                <span className="absolute inset-0 rounded-full bg-gold-400 animate-ping opacity-60" />
                <span className="relative w-2 h-2 rounded-full bg-gold-500" />
              </span>
              AI voice assistant platform
            </span>

            <h1 className="mt-8 font-display text-6xl sm:text-7xl lg:text-[88px] tracking-[-0.02em] leading-[0.98] text-stone-950">
              Build AI assistants
              <span className="block mt-1 font-display italic font-normal tracking-[-0.01em] text-gradient">
                for any website.
              </span>
            </h1>

            <p className="mt-7 text-lg text-stone-600 leading-relaxed max-w-xl">
              Create customisable voice assistants that talk, guide users and
              plug into any website in minutes.
            </p>

            <button
              onClick={handleLogin}
              disabled={signingIn}
              className="btn-primary mt-10 h-14 px-7 text-base"
            >
              <FcGoogle className="text-2xl" />
              {signingIn ? "Signing in…" : "Continue with Google"}
            </button>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
              {PERKS.map((perk) => (
                <li
                  key={perk}
                  className="flex items-center gap-2 text-sm text-stone-600"
                >
                  <FiCheck className="text-gold-600" />
                  {perk}
                </li>
              ))}
            </ul>
          </div>

          {/* Right */}
          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-br from-gold-200/50 via-transparent to-gold-100/60 blur-3xl" />

            <div className="surface relative p-7 sm:p-8">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">
                    Included
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
                    Everything you need
                  </h2>
                </div>

                <img
                  src={logo}
                  alt=""
                  className="w-12 h-12 rounded-full shadow-[0_0_40px_-6px_rgba(176,141,87,0.6)]"
                />
              </div>

              <div className="mt-8 space-y-3">
                {FEATURES.map(({ icon: Icon, title, desc }) => (
                  <div
                    key={title}
                    className="flex gap-4 rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4 transition-colors hover:bg-stone-50"
                  >
                    <div className="shrink-0 w-11 h-11 rounded-xl border border-stone-200 bg-gradient-to-br from-gold-100 to-gold-50 text-gold-700 flex items-center justify-center">
                      <Icon size={18} />
                    </div>

                    <div>
                      <h3 className="text-[15px] font-semibold text-stone-900">
                        {title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-stone-600">
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl bg-[#0c0a14] px-4 py-3 font-mono text-[12px] text-stone-400 overflow-x-auto whitespace-nowrap">
                <span className="text-gold-300">&lt;script</span>{" "}
                <span className="text-emerald-300">src</span>=
                <span className="text-amber-200">"…/assistant.js"</span>
                <span className="text-gold-300">&gt;&lt;/script&gt;</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
