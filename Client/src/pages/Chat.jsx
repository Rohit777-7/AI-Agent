import React, { useEffect, useRef, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  FiMessageCircle,
  FiHome,
  FiSliders,
  FiCreditCard,
  FiLogOut,
  FiMic,
  FiSend,
  FiNavigation,
  FiVolume2,
  FiVolumeX,
  FiTrash2,
  FiEdit2,
  FiArrowUpRight,
  FiCompass,
} from "react-icons/fi";
import logo from "../assets/logo-mark.png";
import { ServerUrl } from "../App";
import { THEME_SWATCHES } from "../utils/themeSwatches";

const SIDEBAR_LINKS = [
  { to: "/chat", label: "Chat", icon: FiMessageCircle },
  { to: "/", label: "Overview", icon: FiHome, end: true },
  { to: "/builder", label: "Assistant Builder", icon: FiSliders },
  { to: "/billing", label: "Plans & Billing", icon: FiCreditCard },
];

const STATUS_STYLES = {
  active: { dot: "bg-emerald-400", text: "text-emerald-600" },
  invalid: { dot: "bg-rose-400", text: "text-rose-600" },
};

const PRO_DAYS = 90;
const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const firstNameOf = (name = "") => {
  const first = name.trim().split(/\s+/)[0] || "there";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};

const cleanPhrase = (text = "") => text.replace(/[^\w\s]/g, "").trim();

const sidebarLinkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? "bg-gradient-to-r from-gold-100 to-gold-50 text-stone-950 shadow-[inset_0_0_0_1px_rgba(201,166,111,0.35)]"
      : "text-stone-600 hover:bg-gold-50 hover:text-stone-950"
  }`;

function Chat({ user, setUser }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceReplies, setVoiceReplies] = useState(false);
  const recognitionRef = useRef(null);
  const endRef = useRef(null);
  const navigateTimerRef = useRef(null);

  const SpeechRecognition =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  useEffect(() => {
    // The studio replaces the site's floating widget, so hide it on this page.
    document.body.classList.add("studio-open");

    return () => {
      document.body.classList.remove("studio-open");
      clearTimeout(navigateTimerRef.current);
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const isPro = user?.plan === "pro";
  const pages = user?.pages || [];
  const firstName = firstNameOf(user?.name);
  const businessName = user?.bussinessName?.trim();

  // Starter prompts built from the user's own pages and business.
  const suggestions = [
    ...pages
      .slice(0, 2)
      .map((page) => `Take me to the ${cleanPhrase(page.keywords?.[0] || page.name)}`),
    `What does ${businessName || "your business"} offer?`,
    "What can you help me with?",
    "How can I contact you?",
  ].slice(0, 4);

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

  const ringPercent = isPro
    ? Math.min(100, (remainingDays / PRO_DAYS) * 100)
    : user?.requestLimit
      ? Math.min(100, ((user?.totalMessages || 0) / user.requestLimit) * 100)
      : 0;

  const status = STATUS_STYLES[user?.geminiStatus] || {
    dot: "bg-amber-400",
    text: "text-amber-600",
  };

  const theme = THEME_SWATCHES[user?.theme] ? user.theme : "dark";

  const voiceLanguage =
    user?.language && user.language !== "auto"
      ? user.language
      : navigator.language || "en-IN";

  // Speaks when voice replies are on. onDone runs when speech ends, fails, or
  // (with voice off) after a short pause to read the reply.
  const speak = (text, onDone) => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      onDone?.();
    };

    if (!voiceReplies || !window.speechSynthesis) {
      if (onDone) navigateTimerRef.current = setTimeout(done, 900);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = voiceLanguage;
      utterance.onend = done;
      utterance.onerror = done;
      window.speechSynthesis.speak(utterance);
      // Some browsers never fire onend when audio is blocked.
      navigateTimerRef.current = setTimeout(done, Math.min(15000, 1500 + text.length * 80));
    } catch {
      done();
    }
  };

  // External sites open in a new tab; app pages open in place. Anything else
  // (javascript:, data:, //other-site) is ignored.
  const goTo = (path) => {
    if (typeof path !== "string") return;

    if (/^https?:\/\//i.test(path)) {
      const url = new URL(path);
      if (url.origin === window.location.origin) {
        navigate(url.pathname + url.search + url.hash);
      } else {
        window.open(url.href, "_blank", "noopener");
      }
      return;
    }

    if ((path.startsWith("/") && !path.startsWith("//")) || path.startsWith("#")) {
      navigate(path);
    }
  };

  // Adds the streamed reply as one assistant message and keeps it updated.
  const updateStreamingReply = (text, streaming = true) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];

      if (last?.streaming) {
        return [...prev.slice(0, -1), { ...last, text, streaming }];
      }

      return [...prev, { role: "assistant", text, streaming }];
    });
  };

  const refreshUser = async () => {
    try {
      const res = await axios.get(ServerUrl + "/api/user/current-user", {
        withCredentials: true,
      });
      setUser(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  const sendMessage = async (raw) => {
    const text = raw.trim();
    if (!text || sending) return;

    // The last few turns let follow-ups like "tell me more" make sense.
    const history = messages
      .filter((message) => !message.error && message.text)
      .slice(-6)
      .map(({ role, text: turnText }) => ({ role, text: turnText }));

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setSending(true);
    clearTimeout(navigateTimerRef.current);

    try {
      let response;

      try {
        response = await fetch(ServerUrl + "/api/assistant/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            userId: user._id,
            currentPath: "/chat",
            history,
            stream: true,
          }),
        });
      } catch {
        throw new Error("Couldn't reach the server. Please try again.");
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Something went wrong. Please try again.");
        }

        if (data.action === "navigate") {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", text: data.response, path: data.path },
          ]);
          // Go there once the reply has been spoken, like the website widget.
          speak(data.response, () => goTo(data.path));
        } else {
          const reply = data.response || data.aiResponse || "Done";
          setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
          speak(reply);
          if (data.aiResponse) refreshUser();
        }

        return;
      }

      // Streamed reply: show the words as they arrive.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        updateStreamingReply(reply);
      }

      reply = reply.trim() || "Sorry, I didn't catch that. Could you rephrase it?";
      updateStreamingReply(reply, false);
      speak(reply);
      refreshUser();
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: error.message || "Something went wrong. Please try again.",
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const toggleListening = () => {
    if (!SpeechRecognition) {
      toast.error("Voice input isn't supported in this browser");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = voiceLanguage;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => sendMessage(event.results[0][0].transcript);
    recognition.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        toast.error("Couldn't hear you. Please try again.");
      }
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const handleLogout = async () => {
    try {
      await axios.post(ServerUrl + "/api/auth/logout", {}, { withCredentials: true });
      setUser(null);
      toast.success("Logout Successfully");
      navigate("/login");
    } catch (error) {
      toast.error("Logout Failed");
      console.log(error);
    }
  };

  return (
    <div className="relative min-h-screen bg-canvas lg:h-screen lg:overflow-hidden">
      <div className="absolute -top-40 left-1/3 w-[620px] h-[460px] rounded-full bg-gold-200/50 blur-[150px] pointer-events-none" />
      <div className="absolute -bottom-40 right-10 w-[460px] h-[360px] rounded-full bg-gold-100/70 blur-[140px] pointer-events-none" />

      <div className="relative mx-auto flex max-w-[1500px] gap-5 p-4 lg:h-full lg:p-5">
        {/* Sidebar */}
        <aside className="surface hidden lg:flex w-64 shrink-0 flex-col p-5">
          <Link to="/" className="flex items-center gap-2.5 px-1">
            <img src={logo} alt="" className="w-9 h-9 rounded-full shadow-[0_0_24px_-6px_rgba(176,141,87,0.6)]" />
            <span className="font-display text-2xl text-stone-950">
              Shifra <span className="italic text-gradient">AI</span>
            </span>
          </Link>

          <nav className="mt-8 space-y-1">
            {SIDEBAR_LINKS.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={sidebarLinkClass}>
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex-1" />

          {isPro ? (
            <div className="rounded-2xl border border-gold-200 bg-gradient-to-br from-gold-50 to-gold-100/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-700">
                Pro member
              </p>
              <p className="mt-2 font-display text-3xl text-stone-950">
                {remainingDays} <span className="text-base text-stone-500">days left</span>
              </p>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl bg-ink p-4">
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gold-500/30 blur-[50px]" />
              <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-300">
                Free plan
              </p>
              <p className="relative mt-2 text-sm text-stone-300">
                {remainingMessages} AI replies left
              </p>
              <button
                onClick={() => navigate("/billing")}
                className="btn-accent relative mt-4 h-9 w-full text-[13px]"
              >
                Upgrade to Pro
              </button>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3 border-t border-gold-200/70 pt-4">
            <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-gold-300 to-gold-600 text-white flex items-center justify-center font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-stone-900">{user?.name}</p>
              <p className="text-xs text-gold-700">{isPro ? "Pro plan" : "Free plan"}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
              className="w-8 h-8 rounded-full flex items-center justify-center text-stone-500 hover:bg-gold-50 hover:text-rose-500 transition-colors"
            >
              <FiLogOut size={15} />
            </button>
          </div>
        </aside>

        {/* Chat */}
        <main className="surface flex min-h-[calc(100vh-2rem)] min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0">
          {/* Compact header for small screens */}
          <div className="flex items-center justify-between gap-3 border-b border-gold-200/60 px-5 py-3 lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="" className="w-7 h-7 rounded-full" />
              <span className="font-display text-xl text-stone-950">
                Shifra <span className="italic text-gradient">AI</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1">
              {SIDEBAR_LINKS.slice(1).map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  title={label}
                  aria-label={label}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-stone-600 hover:bg-gold-50"
                >
                  <Icon size={16} />
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-start justify-between gap-4 px-6 pt-7 sm:px-10 sm:pt-9">
            <div>
              <h1 className="font-display text-4xl sm:text-5xl leading-[1.05] tracking-[-0.015em] text-stone-950">
                Hello, <span className="italic text-gradient">{firstName}</span>
              </h1>
              <p className="mt-2 font-display text-2xl sm:text-3xl text-stone-500">
                How can I help you today?
              </p>
            </div>

            <span className="hidden sm:inline-flex xl:hidden shrink-0 items-center gap-2 rounded-full border border-gold-200 bg-gold-50/70 px-3 py-1.5 text-xs font-medium text-gold-800">
              {isPro ? `Pro · ${remainingDays} days left` : `${remainingMessages} replies left`}
            </span>
          </div>

          {/* Conversation */}
          <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-10 [scrollbar-width:none]">
            {!user?.isSetupComplete ? (
              <div className="mx-auto mt-10 max-w-md rounded-2xl border border-gold-200 bg-gold-50/60 p-8 text-center">
                <p className="font-display text-3xl text-stone-950">Set up your assistant first</p>
                <p className="mt-2 text-sm text-stone-600">
                  Give it a name, a Gemini API key and a few pages, then come back to chat with it.
                </p>
                <button onClick={() => navigate("/builder")} className="btn-primary mt-6">
                  Open the Builder
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-10 pt-10 pb-4 lg:py-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-10">
                <div className="hidden lg:flex flex-col items-end gap-16">
                  {suggestions.slice(0, 2).map((text) => (
                    <SuggestionBubble key={text} text={text} side="left" onPick={sendMessage} />
                  ))}
                </div>

                <div className="relative flex items-center justify-center">
                  <div className="absolute w-56 h-56 lg:w-72 lg:h-72 rounded-full border border-gold-200/70" />
                  <div className="absolute w-44 h-44 lg:w-56 lg:h-56 rounded-full border border-gold-300/60" />
                  <div className="absolute w-36 h-36 lg:w-48 lg:h-48 rounded-full bg-gold-200/60 blur-[50px]" />
                  <img
                    src={logo}
                    alt=""
                    className="relative w-28 h-28 lg:w-36 lg:h-36 rounded-full animate-float shadow-[0_30px_60px_-20px_rgba(67,50,29,0.55)]"
                  />
                </div>

                <div className="hidden lg:flex flex-col items-start gap-16">
                  {suggestions.slice(2, 4).map((text) => (
                    <SuggestionBubble key={text} text={text} side="right" onPick={sendMessage} />
                  ))}
                </div>

                <div className="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
                  {suggestions.map((text) => (
                    <SuggestionBubble key={text} text={text} full onPick={sendMessage} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-5">
                {messages.map((message, index) =>
                  message.role === "user" ? (
                    <div key={index} className="flex justify-end">
                      <p className="max-w-[78%] rounded-2xl rounded-br-md bg-ink px-4 py-3 text-[15px] leading-relaxed text-gold-50 shadow-[0_12px_24px_-16px_rgba(26,23,18,0.6)]">
                        {message.text}
                      </p>
                    </div>
                  ) : (
                    <div key={index} className="flex items-start gap-3">
                      <img src={logo} alt="" className="mt-1 w-8 h-8 shrink-0 rounded-full" />
                      <div
                        className={`max-w-[78%] rounded-2xl rounded-tl-md border px-4 py-3 text-[15px] leading-relaxed ${
                          message.error
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-gold-200/80 bg-[#fffdf9] text-stone-800"
                        }`}
                      >
                        {message.text}
                        {message.path && (
                          <div className="mt-3 flex items-center gap-2 rounded-xl border border-gold-200 bg-gold-50/80 px-3 py-2 text-xs text-gold-800">
                            <FiNavigation className="shrink-0" />
                            Taking you to
                            <code className="font-mono text-stone-900">{message.path}</code>
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                )}

                {sending && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex items-start gap-3">
                    <img src={logo} alt="" className="mt-1 w-8 h-8 shrink-0 rounded-full" />
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-gold-200/80 bg-[#fffdf9] px-4 py-4">
                      {[0, 1, 2].map((dot) => (
                        <span
                          key={dot}
                          className="w-2 h-2 rounded-full bg-gold-400 animate-bounce"
                          style={{ animationDelay: `${dot * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div ref={endRef} />
              </div>
            )}
          </div>

          {/* Composer */}
          {user?.isSetupComplete && (
            <div className="border-t border-gold-200/60 bg-gold-50/40 px-6 py-5 sm:px-10">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage(input);
                }}
                className="mx-auto flex max-w-3xl items-center gap-3"
              >
                <button
                  type="button"
                  onClick={toggleListening}
                  aria-label={listening ? "Stop listening" : "Speak your message"}
                  title={SpeechRecognition ? "Speak your message" : "Voice input isn't supported in this browser"}
                  className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center border transition-all ${
                    listening
                      ? "border-rose-300 bg-rose-500 text-white animate-pulse"
                      : "border-gold-200 bg-[#fffdf9] text-gold-700 hover:border-gold-400"
                  }`}
                >
                  <FiMic size={18} />
                </button>

                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={listening ? "Listening…" : "Type your message here…"}
                  className="field h-12 flex-1 rounded-full px-5"
                />

                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  aria-label="Send message"
                  className="btn-accent w-12 h-12 shrink-0 p-0"
                >
                  <FiSend size={17} />
                </button>
              </form>

              <div className="mx-auto mt-4 flex max-w-3xl flex-wrap items-center justify-center gap-2">
                <QuickAction
                  icon={FiCompass}
                  label="Try a navigation command"
                  onClick={() => setInput(suggestions[0])}
                />
                <QuickAction
                  icon={voiceReplies ? FiVolume2 : FiVolumeX}
                  label={voiceReplies ? "Voice replies on" : "Voice replies off"}
                  active={voiceReplies}
                  onClick={() => {
                    window.speechSynthesis?.cancel();
                    setVoiceReplies(!voiceReplies);
                  }}
                />
                <QuickAction
                  icon={FiTrash2}
                  label="Clear chat"
                  disabled={messages.length === 0}
                  onClick={() => {
                    window.speechSynthesis?.cancel();
                    setMessages([]);
                  }}
                />
                <QuickAction icon={FiEdit2} label="Edit assistant" onClick={() => navigate("/builder")} />
              </div>

              {!isPro && (
                <p className="mt-3 text-center text-[11px] text-stone-500">
                  AI replies here count toward your plan, just like your visitors' messages.
                </p>
              )}
            </div>
          )}
        </main>

        {/* Right column: real account data */}
        <aside className="hidden xl:flex w-80 shrink-0 flex-col gap-5 overflow-y-auto [scrollbar-width:none]">
          <div className="surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-950">Your assistant</h2>
              <Link to="/builder" className="text-xs font-medium text-gold-700 hover:text-gold-900">
                Edit
              </Link>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl border border-black/10 ${THEME_SWATCHES[theme]}`} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-stone-950">{user?.assistantName}</p>
                <p className="truncate text-xs text-stone-500">{businessName || "No business name yet"}</p>
              </div>
            </div>

            <dl className="mt-5 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone-500">Tone</dt>
                <dd className="text-stone-800">{user?.tone}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">Theme</dt>
                <dd className="text-stone-800 capitalize">{theme}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">Gemini</dt>
                <dd className={`inline-flex items-center gap-1.5 capitalize ${status.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {user?.geminiStatus}
                </dd>
              </div>
            </dl>
          </div>

          <div className="surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-950">Usage</h2>
              <span className="rounded-full border border-gold-200 bg-gold-50 px-2.5 py-0.5 text-[11px] font-medium text-gold-800">
                {isPro ? "Pro" : "Free plan"}
              </span>
            </div>

            <div className="mt-5 flex items-center gap-5">
              <div className="relative w-28 h-28 shrink-0">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r={RING_RADIUS} fill="none" stroke="#f6eedb" strokeWidth="10" />
                  <circle
                    cx="60"
                    cy="60"
                    r={RING_RADIUS}
                    fill="none"
                    stroke="url(#usageGold)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={RING_CIRCUMFERENCE * (1 - ringPercent / 100)}
                    className="transition-[stroke-dashoffset] duration-700"
                  />
                  <defs>
                    <linearGradient id="usageGold" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#dec393" />
                      <stop offset="100%" stopColor="#957442" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-3xl leading-none text-stone-950">
                    {Math.round(ringPercent)}%
                  </span>
                  <span className="mt-1 text-[10px] uppercase tracking-[0.12em] text-stone-500">
                    {isPro ? "left" : "used"}
                  </span>
                </div>
              </div>

              <dl className="space-y-3 text-sm">
                {isPro ? (
                  <>
                    <div>
                      <dt className="text-xs text-stone-500">Days left</dt>
                      <dd className="font-semibold text-stone-950">{remainingDays}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-stone-500">AI replies</dt>
                      <dd className="font-semibold text-stone-950">Unlimited</dd>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <dt className="text-xs text-stone-500">Replies used</dt>
                      <dd className="font-semibold text-stone-950">
                        {user?.totalMessages || 0} / {user?.requestLimit}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-stone-500">Replies left</dt>
                      <dd className="font-semibold text-stone-950">{remainingMessages}</dd>
                    </div>
                  </>
                )}
              </dl>
            </div>
          </div>

          <div className="surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-950">Voice navigation</h2>
              <Link to="/builder" className="text-xs font-medium text-gold-700 hover:text-gold-900">
                Manage
              </Link>
            </div>

            {pages.length ? (
              <ul className="mt-4 space-y-2">
                {pages.map((page, index) => (
                  <li key={index}>
                    <button
                      onClick={() =>
                        sendMessage(`Take me to the ${cleanPhrase(page.keywords?.[0] || page.name)}`)
                      }
                      disabled={!user?.isSetupComplete || sending}
                      className="group flex w-full items-center justify-between gap-3 rounded-xl border border-gold-200/70 bg-gold-50/50 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-gold-50"
                    >
                      <span className="truncate capitalize text-stone-800">{page.name}</span>
                      <span className="flex items-center gap-1.5 font-mono text-xs text-stone-500">
                        {page.path}
                        <FiArrowUpRight className="opacity-0 transition-opacity group-hover:opacity-100" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-stone-500">
                No pages yet. Add them in the Builder so visitors can navigate by voice.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SuggestionBubble({ text, side, full, onPick }) {
  return (
    <button
      onClick={() => onPick(text)}
      className={`${full ? "w-full" : "max-w-[230px]"} rounded-2xl border border-gold-200 bg-[#fffdf9]/90 px-4 py-3 text-left text-sm leading-snug text-stone-700 shadow-[0_14px_30px_-20px_rgba(67,50,29,0.45)] transition-all hover:-translate-y-0.5 hover:border-gold-400 hover:text-stone-950 ${
        side === "left" ? "rounded-br-md" : side === "right" ? "rounded-bl-md" : ""
      }`}
    >
      {text}
    </button>
  );
}

function QuickAction({ icon: Icon, label, onClick, active, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? "border-gold-400 bg-gold-100 text-stone-950"
          : "border-gold-200 bg-[#fffdf9] text-stone-700 hover:border-gold-400"
      }`}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

export default Chat;
