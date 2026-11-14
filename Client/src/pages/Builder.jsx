import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiFeather,
  FiMic,
  FiPlus,
  FiTrash2,
  FiCopy,
  FiCheck,
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiExternalLink,
  FiUser,
  FiSmile,
  FiDroplet,
  FiKey,
  FiNavigation,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import axios from "axios";
import { ServerUrl } from "../App.jsx";
import { CLIENT_URL } from "../App.jsx";
import { THEME_SWATCHES } from "../utils/themeSwatches";

const THEMES = ["light", "dark", "glass", "neon", "ocean", "sunset", "rose", "midnight"];

const TONES = ["Formal", "Informal", "Friendly", "Professional"];

const STATUS_STYLES = {
  active: { dot: "bg-emerald-400", text: "text-emerald-600" },
  invalid: { dot: "bg-rose-400", text: "text-rose-600" },
};

const Section = ({ icon: Icon, title, description, action, children }) => (
  <section className="surface p-6 sm:p-7">
    <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
      <div className="flex items-start gap-3.5">
        <div className="shrink-0 w-10 h-10 rounded-xl border border-stone-200 bg-stone-50 text-gold-700 flex items-center justify-center">
          <Icon size={17} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-stone-950">{title}</h2>
          <p className="text-sm text-stone-600 mt-0.5">{description}</p>
        </div>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const StatTile = ({ label, children }) => (
  <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4">
    <p className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500">
      {label}
    </p>
    <div className="mt-2 text-lg font-semibold text-stone-950 capitalize">
      {children}
    </div>
  </div>
);

const Builder = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [editAssistantName, setEditAssistantName] = useState(
    !user?.isSetupComplete,
  );

  const [assistantName, setAssistantName] = useState(user?.assistantName || "");

  const [bussinessName, setBussinessName] = useState(user?.bussinessName || "");

  const [bussinessType, setBussinessType] = useState(user?.bussinessType || "");

  const [bussinessDescription, setBussinessDescription] = useState(
    user?.bussinessDescription || "",
  );

  const [theme, setTheme] = useState(user?.theme || "dark");
  const [tone, setTone] = useState(user?.tone || "Friendly");
  const [geminiApiKey, setGeminiApiKey] = useState(user?.geminiApiKey || "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const [pages, setPages] = useState(user?.pages || []);
  const [pageName, setPageName] = useState("");
  const [pagePath, setPagePath] = useState("");
  const [pageKeywords, setPageKeywords] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizeTheme = (value) => {
    const themeValue = typeof value === "string" ? value.toLowerCase() : "dark";

    return THEMES.includes(themeValue) ? themeValue : "dark";
  };

  useEffect(() => {
    if (!user) return;

    setEditAssistantName(!user.isSetupComplete);

    setAssistantName(user.assistantName || "");
    setBussinessName(user.bussinessName || "");
    setBussinessType(user.bussinessType || "");
    setBussinessDescription(user.bussinessDescription || "");
    setTheme(normalizeTheme(user.theme));
    setTone(user.tone || "Friendly");
    setGeminiApiKey(user.geminiApiKey || "");
    setPages(user.pages || []);
  }, [user]);

  const addPage = () => {
    if (!pageName || !pagePath) return;

    const newPage = {
      name: pageName,
      path: pagePath,
      keywords: pageKeywords
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k !== ""),
    };

    console.log("NEW PAGE:", newPage);

    setPages([...pages, newPage]);

    setPageName("");
    setPagePath("");
    setPageKeywords("");
  };
  const saveAssistant = async () => {
    setLoading(true);

    try {
      const data = {
        assistantName,
        bussinessName,
        bussinessType,
        bussinessDescription,
        tone,
        theme: normalizeTheme(theme),
        geminiApiKey,
        pages,
      };
      console.log("PAGES BEFORE SAVE:", pages);
      const res = await axios.post(
        ServerUrl + "/api/user/save-assistant",
        data,
        { withCredentials: true },
      );

      console.log(res.data);

      setUser(res.data.user);
      setEditAssistantName(false);

      toast.success("Assistant Saved Successfully");

      setLoading(false);
    } catch (error) {
      toast.error("Failed to save assistant");
      console.log(error);

      setLoading(false);
    }
  };
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
  const embedCode = `<script src="${CLIENT_URL}/assistant.js" data-user-id="${user?._id}"></script>`;

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    toast.success("Copied");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const status = STATUS_STYLES[user?.geminiStatus] || {
    dot: "bg-amber-400",
    text: "text-amber-600",
  };

  const isLive = user?.isSetupComplete && !editAssistantName;

  // Example phrases built from the user's own navigation keywords.
  const voiceCommands = [
    ...(user?.pages || []).slice(0, 3).map((page) => {
      const phrase = (page.keywords?.[0] || page.name || "")
        .replace(/[^\w\s]/g, "")
        .trim();
      return `Take me to the ${phrase}`;
    }),
    `What does ${user?.bussinessName || "your business"} offer?`,
  ];

  const usedPercent = user?.requestLimit
    ? Math.min(100, ((user?.totalMessages || 0) / user.requestLimit) * 100)
    : 0;

  return (
    <div className="relative min-h-screen bg-canvas pt-16">
      <div className="absolute inset-x-0 top-0 h-[420px] bg-grid pointer-events-none" />
      <div className="absolute -top-40 left-1/3 w-[520px] h-[420px] rounded-full bg-gold-200/50 blur-[140px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="mb-10">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold-600">
            Assistant Builder
          </p>
          <h1 className="mt-3 font-display text-5xl sm:text-6xl leading-[1.02] tracking-[-0.015em] text-stone-950">
            {isLive ? "Your assistant is live" : "Design your assistant"}
          </h1>
          <p className="text-stone-600 mt-2">
            {isLive
              ? "Install it on your website or fine-tune how it talks."
              : "Customize your virtual assistant's identity, voice and look."}
          </p>
        </div>

        {isLive && (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
            <div className="surface p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl border border-black/10 shadow-[0_10px_40px_-10px_rgba(149,116,66,0.5)] ${THEME_SWATCHES[normalizeTheme(user.theme)]}`}
                  />
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-stone-950">
                      {user.assistantName}
                    </h2>
                    <p className="text-sm text-stone-600 mt-0.5">
                      {user.bussinessName || "Your business"}
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Ready to embed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
                <StatTile label="Current Plan">{user?.plan}</StatTile>
                <StatTile label="Gemini Status">
                  <span className={`inline-flex items-center gap-2 ${status.text}`}>
                    <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                    {user?.geminiStatus}
                  </span>
                </StatTile>
                <StatTile
                  label={user?.plan === "free" ? "Messages Left" : "Plan Expiry"}
                >
                  {user?.plan === "free"
                    ? remainingMessages
                    : `${remainingDays} Days`}
                </StatTile>
              </div>

              <div className="mt-10">
                <h3 className="text-base font-semibold text-stone-950">
                  Install on your website
                </h3>
                <p className="text-sm text-stone-600 mt-1">
                  Paste this script before the closing{" "}
                  <code className="font-mono text-gold-700">{"</body>"}</code>{" "}
                  tag of your website HTML file.
                </p>

                <div className="mt-5 rounded-2xl border border-stone-900 bg-[#0c0a14] overflow-hidden shadow-[0_20px_40px_-20px_rgba(12,10,20,0.6)]">
                  <div className="flex items-center justify-between px-4 h-11 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                      <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                      <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                      <span className="ml-3 font-mono text-xs text-stone-500">
                        index.html
                      </span>
                    </div>

                    <button
                      onClick={copyEmbedCode}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-300 hover:bg-white/10 transition-colors"
                    >
                      {copied ? <FiCheck className="text-emerald-400" /> : <FiCopy />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>

                  <pre className="p-5 text-[13px] leading-6 font-mono text-stone-500 overflow-x-auto">
                    <span className="text-gold-300">{"<body>"}</span>
                    {"\n\n  Your Website Content\n\n  "}
                    <span className="text-emerald-300">{embedCode}</span>
                    {"\n\n"}
                    <span className="text-gold-300">{"</body>"}</span>
                  </pre>
                </div>
              </div>

              <button
                onClick={() => setEditAssistantName(true)}
                className="btn-ghost mt-8"
              >
                <FiEdit2 size={15} />
                Edit Assistant
              </button>
            </div>

            <aside className="surface p-6 lg:sticky lg:top-24">
              <h3 className="text-sm font-semibold text-stone-950">Configuration</h3>

              <dl className="mt-5 space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500">Business type</dt>
                  <dd className="text-stone-800 text-right truncate">
                    {user.bussinessType || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500">Tone</dt>
                  <dd className="text-stone-800">{user.tone}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500">Theme</dt>
                  <dd className="flex items-center gap-2 text-stone-800 capitalize">
                    <span
                      className={`w-3.5 h-3.5 rounded-full border border-black/10 ${THEME_SWATCHES[normalizeTheme(user.theme)]}`}
                    />
                    {normalizeTheme(user.theme)}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 pt-6 border-t border-stone-200/80">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500">
                  Navigation pages
                </p>

                {user.pages?.length ? (
                  <ul className="mt-3 space-y-2">
                    {user.pages.map((page, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between gap-3 rounded-xl border border-stone-200/80 bg-stone-50/70 px-3 py-2.5 text-sm"
                      >
                        <span className="text-stone-800 capitalize truncate">
                          {page.name}
                        </span>
                        <span className="font-mono text-xs text-stone-500">
                          {page.path}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-stone-500">
                    No pages added yet.
                  </p>
                )}
              </div>
            </aside>
          </div>
        )}

        {isLive && (
          <section className="mt-20">
            <div className="flex items-center gap-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold-600">
                Next steps
              </p>
              <div className="h-px flex-1 bg-gradient-to-r from-gold-300/70 to-transparent" />
            </div>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl tracking-[-0.015em] text-stone-950">
              Make the most of{" "}
              <span className="italic text-gradient">{user.assistantName}</span>
            </h2>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              <div className="surface p-7">
                <div className="w-11 h-11 rounded-xl border border-gold-200 bg-gradient-to-br from-gold-100 to-gold-50 text-gold-700 flex items-center justify-center">
                  <FiMic size={18} />
                </div>
                <h3 className="mt-6 text-lg font-semibold text-stone-950">
                  Try these voice commands
                </h3>
                <p className="mt-1 text-sm text-stone-600">
                  Open your site, tap the assistant and say:
                </p>
                <ul className="mt-5 space-y-2">
                  {voiceCommands.map((command) => (
                    <li
                      key={command}
                      className="rounded-xl border border-gold-200/70 bg-gold-50/70 px-4 py-2.5 font-display text-lg italic text-stone-800"
                    >
                      “{command}”
                    </li>
                  ))}
                </ul>
              </div>

              <div className="surface p-7 flex flex-col">
                <div className="w-11 h-11 rounded-xl border border-gold-200 bg-gradient-to-br from-gold-100 to-gold-50 text-gold-700 flex items-center justify-center">
                  <FiFeather size={18} />
                </div>
                <h3 className="mt-6 text-lg font-semibold text-stone-950">
                  Sharpen its answers
                </h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-600 flex-1">
                  <li className="flex gap-3">
                    <FiCheck className="mt-1 shrink-0 text-gold-600" />
                    Describe your products, prices and opening hours in the
                    business description.
                  </li>
                  <li className="flex gap-3">
                    <FiCheck className="mt-1 shrink-0 text-gold-600" />
                    Match the tone to your brand. It's set to {user.tone} now.
                  </li>
                  <li className="flex gap-3">
                    <FiCheck className="mt-1 shrink-0 text-gold-600" />
                    Add a page for every section visitors ask about.
                  </li>
                </ul>
                <button
                  onClick={() => setEditAssistantName(true)}
                  className="btn-ghost mt-6 self-start"
                >
                  <FiEdit2 size={14} />
                  Edit details
                </button>
              </div>

              <div className="relative overflow-hidden rounded-[24px] bg-ink p-7 flex flex-col shadow-[0_30px_60px_-30px_rgba(26,23,18,0.7)]">
                <div className="absolute -top-20 -right-16 w-60 h-60 rounded-full bg-gold-500/25 blur-[80px]" />
                <div className="absolute inset-x-8 top-0 gold-rule" />

                <p className="relative text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-300">
                  {user.plan === "pro" ? "Pro membership" : "Your free plan"}
                </p>

                <p className="relative mt-6 font-display text-6xl leading-none text-gold-50">
                  {user.plan === "pro" ? remainingDays : remainingMessages}
                </p>
                <p className="relative mt-2 text-sm text-stone-400">
                  {user.plan === "pro"
                    ? "days of Pro remaining"
                    : `AI replies left of ${user.requestLimit}`}
                </p>

                {user.plan === "pro" && (
                  <>
                    {user.proExpiresAt && (
                      <p className="relative mt-1 text-xs text-stone-500">
                        Ends on{" "}
                        {new Date(user.proExpiresAt).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    )}
                    <ul className="relative mt-6 space-y-2.5 text-sm text-stone-300">
                      {["Unlimited AI replies", "Priority performance", "Premium support"].map((perk) => (
                        <li key={perk} className="flex items-center gap-2.5">
                          <FiCheck className="shrink-0 text-gold-300" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {user.plan !== "pro" && (
                  <div className="relative mt-5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-500"
                      style={{ width: `${100 - usedPercent}%` }}
                    />
                  </div>
                )}

                <div className="flex-1" />

                <button
                  onClick={() => navigate("/billing")}
                  className="btn-accent relative mt-8 w-full"
                >
                  {user.plan === "pro" ? "View membership" : "Upgrade to Pro"}
                  <FiArrowRight />
                </button>
              </div>
            </div>
          </section>
        )}

        {editAssistantName && (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
            <div className="space-y-6">
              <Section
                icon={FiUser}
                title="Basic Information"
                description="Who your assistant is and what your business does."
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="field-label" htmlFor="assistantName">
                      Assistant name
                    </label>
                    <input
                      id="assistantName"
                      type="text"
                      placeholder="Shifra"
                      onChange={(e) => setAssistantName(e.target.value)}
                      value={assistantName}
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="bussinessName">
                      Business name
                    </label>
                    <input
                      id="bussinessName"
                      type="text"
                      placeholder="Acme Studio"
                      onChange={(e) => setBussinessName(e.target.value)}
                      value={bussinessName}
                      className="field"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="field-label" htmlFor="bussinessType">
                      Business type
                    </label>
                    <input
                      id="bussinessType"
                      type="text"
                      placeholder="Design agency, online store, clinic…"
                      onChange={(e) => setBussinessType(e.target.value)}
                      value={bussinessType}
                      className="field"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="field-label" htmlFor="bussinessDescription">
                      Business description
                    </label>
                    <textarea
                      id="bussinessDescription"
                      rows={4}
                      placeholder="What you offer, who you serve, and anything visitors often ask about."
                      onChange={(e) => setBussinessDescription(e.target.value)}
                      value={bussinessDescription}
                      className="field resize-none leading-6"
                    />
                  </div>
                </div>
              </Section>

              <Section
                icon={FiSmile}
                title="Personality"
                description="How your assistant sounds when it replies."
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 rounded-2xl border border-stone-200/80 bg-stone-100">
                  {TONES.map((item) => (
                    <button
                      key={item}
                      onClick={() => setTone(item)}
                      aria-pressed={tone === item}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                        tone === item
                          ? "bg-white text-stone-900 shadow-sm"
                          : "text-stone-600 hover:text-stone-950 hover:bg-stone-100"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </Section>

              <Section
                icon={FiDroplet}
                title="Appearance"
                description="Pick the widget theme your visitors will see."
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {THEMES.map((item) => (
                    <button
                      key={item}
                      onClick={() => setTheme(item)}
                      aria-pressed={theme === item}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-sm capitalize transition-all ${
                        theme === item
                          ? "border-gold-400/70 bg-gold-400/10 text-stone-950 shadow-[0_0_0_4px_rgba(201,166,111,0.18)]"
                          : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full border border-black/10 ${THEME_SWATCHES[item]}`}
                      />
                      {item}
                    </button>
                  ))}
                </div>
              </Section>

              <Section
                icon={FiKey}
                title="Gemini API Key"
                description="Add your Gemini API key to power your assistant."
                action={
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost h-9 px-3.5 text-[13px]"
                  >
                    Get API key
                    <FiExternalLink size={13} />
                  </a>
                }
              >
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    placeholder="AIza..."
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    value={geminiApiKey}
                    className="field pr-12 font-mono"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    aria-label={showApiKey ? "Hide API key" : "Show API key"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-stone-600 hover:text-stone-950 hover:bg-stone-100"
                  >
                    {showApiKey ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </Section>

              <Section
                icon={FiNavigation}
                title="Navigation Pages"
                description="Let visitors open pages by voice, e.g. “go to pricing”."
              >
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1.4fr_auto] gap-3 items-end">
                  <div>
                    <label className="field-label" htmlFor="pageName">
                      Page
                    </label>
                    <input
                      id="pageName"
                      type="text"
                      placeholder="Pricing"
                      className="field"
                      onChange={(e) => setPageName(e.target.value)}
                      value={pageName}
                    />
                  </div>

                  <div>
                    <label className="field-label" htmlFor="pagePath">
                      Path
                    </label>
                    <input
                      id="pagePath"
                      type="text"
                      placeholder="/pricing"
                      className="field font-mono"
                      onChange={(e) => setPagePath(e.target.value)}
                      value={pagePath}
                    />
                  </div>

                  <div>
                    <label className="field-label" htmlFor="pageKeywords">
                      Keywords
                    </label>
                    <input
                      id="pageKeywords"
                      type="text"
                      placeholder="pricing, plans"
                      className="field"
                      onChange={(e) => setPageKeywords(e.target.value)}
                      value={pageKeywords}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={addPage}
                    disabled={!pageName || !pagePath}
                    className="btn-ghost h-[46px]"
                  >
                    <FiPlus />
                    Add
                  </button>
                </div>

                <div className="mt-5 space-y-2">
                  {pages.length === 0 && (
                    <p className="rounded-xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
                      No pages yet. Add one above.
                    </p>
                  )}

                  {pages.map((page, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-4 rounded-xl border border-stone-200/80 bg-stone-50/70 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <p className="font-medium text-stone-900 capitalize truncate">
                            {page.name}
                          </p>
                          <p className="font-mono text-xs text-stone-500">
                            {page.path}
                          </p>
                        </div>

                        {page.keywords?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {page.keywords.map((keyword) => (
                              <span
                                key={keyword}
                                className="rounded-md bg-gold-400/10 px-2 py-0.5 text-xs text-gold-700"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() =>
                          setPages(pages.filter((_, i) => i !== index))
                        }
                        aria-label={`Remove ${page.name}`}
                        className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-stone-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            <aside className="surface p-6 lg:sticky lg:top-24">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500">
                Summary
              </p>

              <div className="mt-5 flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl border border-black/10 ${THEME_SWATCHES[normalizeTheme(theme)]}`}
                />
                <div className="min-w-0">
                  <p className="font-semibold text-stone-950 truncate">
                    {assistantName || "Unnamed assistant"}
                  </p>
                  <p className="text-sm text-stone-500 truncate">
                    {bussinessName || "Business name"}
                  </p>
                </div>
              </div>

              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-500">Tone</dt>
                  <dd className="text-stone-800">{tone}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Theme</dt>
                  <dd className="text-stone-800 capitalize">{normalizeTheme(theme)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">API key</dt>
                  <dd className={geminiApiKey ? "text-emerald-600" : "text-amber-600"}>
                    {geminiApiKey ? "Added" : "Missing"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Pages</dt>
                  <dd className="text-stone-800">{pages.length}</dd>
                </div>
              </dl>

              <button
                type="submit"
                onClick={saveAssistant}
                disabled={loading}
                className="btn-primary w-full mt-7 h-12"
              >
                {loading
                  ? "Saving..."
                  : user.isSetupComplete
                    ? "Update Assistant"
                    : "Save Assistant"}
              </button>

              {user.isSetupComplete && (
                <button
                  onClick={() => setEditAssistantName(false)}
                  className="w-full mt-2 h-10 rounded-xl text-sm text-stone-600 hover:text-stone-950 transition-colors"
                >
                  Cancel
                </button>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};

export default Builder;
