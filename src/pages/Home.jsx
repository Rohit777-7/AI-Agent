import React from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowRight, FiMic, FiNavigation, FiDroplet, FiCode } from "react-icons/fi";
import AssistantPreview from "../components/AssistantPreview";
import logo from "../assets/logo-mark.png";

const STEPS = [
  {
    step: "01",
    title: "Sign up free",
    desc: "Continue with Google and create your assistant instantly.",
  },
  {
    step: "02",
    title: "Customize assistant",
    desc: "Set your business name, tone, voice and theme.",
  },
  {
    step: "03",
    title: "Train your assistant",
    desc: "Add business details and personalize responses.",
  },
  {
    step: "04",
    title: "Embed anywhere",
    desc: "Copy one script tag and add it to your website.",
  },
];

const HIGHLIGHTS = [
  {
    icon: FiMic,
    title: "Natural voice conversations",
    desc: "Visitors speak, and your assistant answers out loud in real time.",
  },
  {
    icon: FiNavigation,
    title: "Voice navigation",
    desc: "Map keywords to pages so visitors can just say where to go.",
  },
  {
    icon: FiDroplet,
    title: "Eight polished themes",
    desc: "Light, dark, glass, neon and more to match your brand.",
  },
  {
    icon: FiCode,
    title: "One-line install",
    desc: "Paste a single script tag before </body>. No build step.",
  },
];

const STATS = [
  { value: "200", label: "Free AI responses" },
  { value: "8", label: "Widget themes" },
  { value: "4", label: "Voice tones" },
  { value: "1", label: "Script tag to install" },
];

const Home = ({ user }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas overflow-hidden pt-16">
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 pt-16 sm:pt-24 pb-20">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute -top-32 left-[10%] w-[520px] h-[520px] rounded-full bg-violet-600/20 blur-[140px]" />
        <div className="absolute top-40 right-[5%] w-[420px] h-[420px] rounded-full bg-emerald-500/10 blur-[140px]" />

        <div className="relative max-w-6xl mx-auto grid lg:grid-cols-[1.15fr_1fr] gap-16 items-center">
          <div className="text-center lg:text-left">
            <span className="eyebrow">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Voice AI for modern websites
            </span>

            <h1 className="mt-8 text-[44px] leading-[1.05] sm:text-6xl lg:text-[76px] font-semibold tracking-[-0.04em] text-zinc-950">
              Add a{" "}
              <span className="font-display italic font-normal tracking-[-0.01em] text-gradient pr-2">
                virtual assistant
              </span>{" "}
              to your website
            </h1>

            <p className="mt-7 max-w-xl mx-auto lg:mx-0 text-base sm:text-lg text-zinc-600 leading-relaxed">
              Create a smart voice-enabled assistant that talks to visitors,
              answers questions and helps them navigate your website instantly.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <button
                onClick={() => navigate("/builder")}
                className="btn-primary h-12 px-6 w-full sm:w-auto"
              >
                {user?.isSetupComplete ? "Open your assistant" : "Build your assistant"}
                <FiArrowRight />
              </button>

              <button
                onClick={() => navigate("/billing")}
                className="btn-ghost h-12 px-6 w-full sm:w-auto"
              >
                View plans
              </button>
            </div>

            <p className="mt-5 text-sm text-zinc-500">
              Free plan includes 200 AI responses
            </p>
          </div>

          {/* Assistant Preview */}
          <div className="relative flex justify-center">
            <div className="absolute inset-10 bg-gradient-to-br from-violet-500/30 to-emerald-500/20 blur-[90px]" />
            <div className="relative">
              <AssistantPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 rounded-3xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(16,16,32,0.04)] divide-x divide-y md:divide-y-0 divide-zinc-200 overflow-hidden">
          {STATS.map((stat) => (
            <div key={stat.label} className="px-6 py-8 text-center">
              <p className="text-4xl font-semibold tracking-tight text-zinc-950">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Highlights */}
      <section className="px-4 sm:px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-600">
              Why Shifra
            </p>
            <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-[-0.03em] text-zinc-950">
              Everything a website assistant{" "}
              <span className="font-display italic font-normal text-gradient">
                needs.
              </span>
            </h2>
          </div>

          <div className="mt-14 grid sm:grid-cols-2 gap-4">
            {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="surface p-7 transition-colors hover:border-zinc-300"
              >
                <div className="w-11 h-11 rounded-xl border border-zinc-200 bg-gradient-to-br from-violet-500/25 to-emerald-500/10 text-violet-700 flex items-center justify-center">
                  <Icon size={18} />
                </div>

                <h3 className="mt-6 text-lg font-semibold text-zinc-950">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="px-4 sm:px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-zinc-950">
              Get started in minutes
            </h2>

            <p className="text-zinc-600 mt-3">
              Simple setup. No complicated integration.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {STEPS.map((s) => (
              <div
                key={s.step}
                className="group relative rounded-3xl border border-zinc-200 bg-white p-7 transition-all hover:shadow-[0_20px_40px_-20px_rgba(16,16,32,0.18)] hover:-translate-y-1"
              >
                <div className="absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <span className="font-mono text-sm text-violet-600">
                  {s.step}
                </span>

                <h3 className="mt-6 text-lg font-semibold text-zinc-950">
                  {s.title}
                </h3>

                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 pb-24">
        <div className="surface relative max-w-6xl mx-auto overflow-hidden px-8 py-14 sm:px-14 text-center">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-violet-600/25 blur-[100px]" />

          <h2 className="relative text-3xl sm:text-5xl font-semibold tracking-[-0.03em] text-zinc-950">
            Give your website a{" "}
            <span className="font-display italic font-normal text-gradient">
              voice.
            </span>
          </h2>

          <p className="relative mt-4 text-zinc-600 max-w-lg mx-auto">
            Set up your assistant, copy one line, and start talking to your
            visitors today.
          </p>

          <button
            onClick={() => navigate("/builder")}
            className="btn-primary relative mt-8 h-12 px-7"
          >
            Start building
            <FiArrowRight />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3"
          >
            <img src={logo} alt="" className="w-8 h-8 rounded-full" />

            <div className="text-left">
              <p className="text-lg font-bold text-zinc-950 leading-none">
                Shifra <span className="text-gradient">AI</span>
              </p>

              <p className="mt-1.5 text-zinc-500 text-sm">
                Voice AI assistant for websites
              </p>
            </div>
          </button>

          <p className="text-zinc-500 text-sm">
            © {new Date().getFullYear()} ShifraAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
