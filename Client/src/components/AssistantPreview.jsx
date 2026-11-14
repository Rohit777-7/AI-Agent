import React, { useState, useEffect } from "react";
import { FaMicrophone } from "react-icons/fa6";
import { THEME_SWATCHES } from "../utils/themeSwatches";

const WAVE_HEIGHTS = ["h-3", "h-6", "h-4", "h-7", "h-5", "h-3", "h-6"];

const themes = {
  dark: {
    bg: "bg-[#050816]",
    overlay:
      "bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_45%)]",
    orb: "from-cyan-400 via-purple-500 to-pink-500",
    cardBorder: "border border-white/10",
    text: "text-white",
    sub: "text-white/65",
    listening: "text-emerald-400",
    wave: "bg-emerald-400",
    button: "from-purple-500 to-violet-400",
    micGlow: "shadow-[0_0_60px_rgba(168,85,247,0.45)]",
  },

  light: {
    bg: "bg-gradient-to-br from-white via-[#f8fafc] to-[#eef6ff]",
    overlay:
      "bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_45%)]",
    orb: "from-blue-300 via-cyan-300 to-pink-300",
    cardBorder: "border border-[#dbeafe]",
    text: "text-[#081028]",
    sub: "text-[#475569]",
    listening: "text-blue-500",
    wave: "bg-blue-500",
    button: "from-blue-400 to-cyan-400",
    micGlow: "shadow-[0_0_70px_rgba(59,130,246,0.35)]",
  },

  glass: {
    bg: "bg-black/20 backdrop-blur-[45px]",
    overlay:
      "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)]",
    orb: "from-cyan-200 via-violet-300 to-fuchsia-300",
    cardBorder: "border border-white/10",
    text: "text-white",
    sub: "text-white/70",
    listening: "text-cyan-200",
    wave: "bg-cyan-200",
    button: "from-cyan-400 to-violet-500",
    micGlow: "shadow-[0_0_70px_rgba(34,211,238,0.35)]",
  },

  neon: {
    bg: "bg-[#03120d]",
    overlay:
      "bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_45%)]",
    orb: "from-emerald-300 via-green-400 to-cyan-400",
    cardBorder: "border border-emerald-400/20",
    text: "text-emerald-50",
    sub: "text-emerald-100/70",
    listening: "text-emerald-300",
    wave: "bg-emerald-300",
    button: "from-emerald-400 to-green-500",
    micGlow: "shadow-[0_0_70px_rgba(16,185,129,0.45)]",
  },

  ocean: {
    bg: "bg-gradient-to-br from-[#03111f] via-[#06254a] to-[#0ea5e9]",
    overlay:
      "bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.22),transparent_45%)]",
    orb: "from-cyan-300 via-sky-400 to-blue-500",
    cardBorder: "border border-cyan-300/20",
    text: "text-white",
    sub: "text-sky-100/75",
    listening: "text-cyan-200",
    wave: "bg-cyan-200",
    button: "from-cyan-400 to-sky-500",
    micGlow: "shadow-[0_0_70px_rgba(14,165,233,0.45)]",
  },

  sunset: {
    bg: "bg-gradient-to-br from-[#1f0b1a] via-[#5b173d] to-[#ff7a59]",
    overlay:
      "bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.20),transparent_45%)]",
    orb: "from-amber-300 via-rose-400 to-orange-500",
    cardBorder: "border border-rose-200/20",
    text: "text-white",
    sub: "text-rose-50/75",
    listening: "text-amber-200",
    wave: "bg-amber-200",
    button: "from-rose-400 to-orange-500",
    micGlow: "shadow-[0_0_70px_rgba(251,146,60,0.42)]",
  },

  rose: {
    bg: "bg-gradient-to-br from-[#2a1020] via-[#4a1632] to-[#f472b6]",
    overlay:
      "bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.20),transparent_45%)]",
    orb: "from-pink-200 via-rose-300 to-fuchsia-400",
    cardBorder: "border border-pink-200/20",
    text: "text-white",
    sub: "text-pink-50/75",
    listening: "text-pink-200",
    wave: "bg-pink-200",
    button: "from-pink-400 to-rose-500",
    micGlow: "shadow-[0_0_70px_rgba(244,114,182,0.42)]",
  },

  midnight: {
    bg: "bg-gradient-to-br from-[#020617] via-[#111827] to-[#1e293b]",
    overlay:
      "bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.14),transparent_45%)]",
    orb: "from-slate-200 via-indigo-300 to-violet-400",
    cardBorder: "border border-slate-500/20",
    text: "text-slate-50",
    sub: "text-slate-300/75",
    listening: "text-indigo-200",
    wave: "bg-indigo-200",
    button: "from-slate-300 to-indigo-400",
    micGlow: "shadow-[0_0_70px_rgba(129,140,248,0.35)]",
  },
};

const AssistantPreview = () => {
  const [theme, setTheme] = useState("dark");
  const [liveWidgetOpen, setLiveWidgetOpen] = useState(false);
  const current = themes[theme];

  // Step aside while the real assistant widget is open, so the two never overlap.
  useEffect(() => {
    const onToggle = (event) => setLiveWidgetOpen(!!event.detail?.open);
    window.addEventListener("shifra-popup-toggle", onToggle);
    return () => window.removeEventListener("shifra-popup-toggle", onToggle);
  }, []);

  const updateTheme = (nextTheme) => {
    setTheme(nextTheme);

    if (typeof window !== "undefined") {
      window.localStorage.setItem("shifra-theme", nextTheme);
      window.dispatchEvent(
        new CustomEvent("shifra-theme-change", {
          detail: { theme: nextTheme },
        }),
      );
    }
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        aria-hidden={liveWidgetOpen}
        className={`relative w-[290px] h-[460px] sm:w-[340px] sm:h-[520px] rounded-[36px] overflow-hidden transition-all duration-500 ${current.bg} ${current.cardBorder} shadow-[0_40px_100px_-30px_rgba(30,20,60,0.45)] ${
          liveWidgetOpen ? "opacity-0 scale-95 pointer-events-none" : ""
        }`}
      >
        {/* Background Overlay */}
        <div className={`absolute inset-0 ${current.overlay}`} />

        {/* Content */}
        <div className="relative z-20 flex flex-col items-center justify-between h-full px-6 py-8 sm:px-8 sm:py-10">
          {/* Orb */}
          <div className="relative mt-2">
            <div
              className={`absolute inset-0 scale-[2] rounded-full blur-[80px] bg-gradient-to-r ${current.orb} opacity-60`}
            />

            <div
              className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br ${current.orb} shadow-[0_0_120px_rgba(255,255,255,0.15)] animate-float before:absolute before:inset-0 before:rounded-full before:bg-white/20 before:blur-xl`}
            />
          </div>

          <div className="text-center">
            <h2
              className={`text-[22px] sm:text-[28px] font-semibold tracking-tight ${current.text}`}
            >
              Hello! I'm Shifra AI
            </h2>

            <p
              className={`mt-3 text-[13px] sm:text-[15px] leading-6 max-w-[260px] mx-auto ${current.sub}`}
            >
              Your smart voice assistant.
              <br />
              Ask anything about your website.
            </p>

            <div className="mt-7">
              <p className={`text-sm font-medium ${current.listening}`}>
                Listening…
              </p>

              <div className="flex items-center justify-center gap-1.5 h-8 mt-3">
                {WAVE_HEIGHTS.map((height, i) => (
                  <span
                    key={i}
                    className={`w-1 ${height} rounded-full origin-center animate-wave ${current.wave}`}
                    style={{ animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="relative flex justify-center">
            <div
              className={`absolute w-20 h-20 rounded-full blur-2xl opacity-50 ${current.wave}`}
            />

            <button
              aria-label="Microphone"
              className={`relative w-16 h-16 rounded-full bg-gradient-to-br ${current.button} ${current.micGlow} flex items-center justify-center`}
            >
              <FaMicrophone size={22} className="text-black/70" />
            </button>
          </div>
        </div>
      </div>

      {/* Theme switcher */}
      <div className="flex items-center gap-3 rounded-full border border-gold-200 bg-[#fffdf9] shadow-[0_10px_30px_-18px_rgba(67,50,29,0.35)] pl-4 pr-2 py-2">
        <span className="text-xs font-medium text-stone-600 capitalize w-16">
          {theme}
        </span>

        <div className="flex items-center gap-1.5">
          {Object.entries(THEME_SWATCHES).map(([name, swatch]) => (
            <button
              key={name}
              onClick={() => updateTheme(name)}
              title={name}
              aria-label={`${name} theme`}
              aria-pressed={theme === name}
              className={`w-5 h-5 rounded-full ring-offset-2 ring-offset-white border border-black/10 transition-all ${swatch} ${
                theme === name ? "ring-2 ring-gold-500 scale-110" : "hover:scale-110"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AssistantPreview;