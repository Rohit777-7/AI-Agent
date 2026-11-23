/*
 * ShifraAI website assistant.
 *
 * <script src="https://YOUR-SHIFRA-DOMAIN/assistant.js" data-user-id="..."
 *         data-position="right" data-offset="18" data-theme="dark" data-z-index="9000"></script>
 *
 * Renders inside a Shadow DOM so the host site's CSS can't affect it (or the reverse).
 */
(function () {
  "use strict";

  if (window.__shifraAssistantLoaded) {
    console.warn("[Shifra] assistant.js is included more than once; ignoring the extra copy.");
    return;
  }
  window.__shifraAssistantLoaded = true;

  const script =
    document.currentScript ||
    Array.from(document.querySelectorAll("script[src]")).find((el) =>
      /\/assistant(\.min)?\.js(\?|#|$)/.test(el.src),
    );

  const userId = script?.dataset?.userId;

  if (!script || !userId) {
    console.warn(
      "[Shifra] Missing data-user-id on the assistant <script> tag. Copy the embed code from your ShifraAI Builder.",
    );
    return;
  }

  // Everything the widget loads or calls lives on the domain this script was served from.
  const BASE_URL = new URL(script.src, window.location.href).origin;

  const THEME_STORAGE_KEY = "shifra-theme";
  const SUPPORTED_THEMES = ["light", "dark", "glass", "neon", "ocean", "sunset", "rose", "midnight"];
  const MAX_HISTORY_TURNS = 6;

  const numberOption = (value, min, max, fallback) => {
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  };

  const normalizeTheme = (value) => {
    const themeValue = typeof value === "string" ? value.toLowerCase() : "";
    return SUPPORTED_THEMES.includes(themeValue) ? themeValue : null;
  };

  const getStoredTheme = () => {
    try {
      return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
    } catch (error) {
      return null;
    }
  };

  const options = {
    position: script.dataset.position === "left" ? "left" : "right",
    offset: numberOption(script.dataset.offset, 0, 200, 18),
    theme: normalizeTheme(script.dataset.theme),
    zIndex: numberOption(script.dataset.zIndex, 1, 2147483647, 9000),
  };

  let assistantConfig = null;
  let currentTheme = options.theme || getStoredTheme() || "dark";
  const history = [];

  // ---------- Shadow DOM host ----------

  const host = document.createElement("div");
  host.id = "shifra-assistant-root";
  host.dataset.position = options.position;
  host.style.cssText = `position:fixed;top:0;left:0;width:0;height:0;z-index:${options.zIndex};visibility:hidden;`;
  host.style.setProperty("--shifra-offset", `${options.offset}px`);

  const shadow = host.attachShadow({ mode: "open" });

  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = `${BASE_URL}/assistant.css`;
  // Stay hidden until styled, so visitors never see an unstyled flash.
  stylesheet.onload = stylesheet.onerror = () => {
    host.style.visibility = "visible";
  };
  shadow.appendChild(stylesheet);

  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shifra-popup theme-${currentTheme}" role="dialog" aria-modal="false" aria-labelledby="shifra-title">
      <div class="shifra-overlay"></div>

      <div class="shifra-content">
        <button class="shifra-close" type="button" aria-label="Close assistant">&times;</button>

        <div class="shifra-top">
          <div class="shifra-orb-wrap" aria-hidden="true">
            <div class="shifra-orb-glow"></div>
            <div class="shifra-orb"></div>
          </div>

          <h2 class="shifra-title" id="shifra-title">Hello! I'm Shifra AI</h2>

          <p class="shifra-sub">Your smart voice assistant.<br />Ask anything about your website.</p>

          <div class="shifra-status" role="status" aria-live="polite"></div>

          <div class="shifra-wave" aria-hidden="true">
            <span></span><span></span><span></span><span></span><span></span><span></span>
          </div>

          <div class="shifra-user-text"></div>
          <div class="shifra-ai-text" aria-live="polite"></div>
        </div>

        <div class="shifra-bottom">
          <button class="shifra-mic" type="button" aria-label="Speak to the assistant" aria-pressed="false">
            <img src="${BASE_URL}/mic.svg" alt="" class="shifra-mic-icon" />
          </button>
        </div>

        <div class="shifra-footer">
          <form class="shifra-command-form">
            <input
              class="shifra-command-input"
              type="text"
              placeholder="Tell me what to do..."
              autocomplete="off"
              aria-label="Type your question"
              maxlength="500"
            />
            <button class="shifra-command-btn" type="submit">Send</button>
          </form>
        </div>
      </div>
    </div>

    <button class="shifra-btn theme-${currentTheme}" type="button" aria-label="Open voice assistant" aria-haspopup="dialog" aria-expanded="false">
      <span class="shifra-btn-mark"></span>
      <img src="${BASE_URL}/shifra-mark.webp" alt="" width="34" height="34" />
    </button>
  `;

  while (container.firstElementChild) {
    shadow.appendChild(container.firstElementChild);
  }

  const mount = () => document.body.appendChild(host);

  if (document.body) {
    mount();
  } else {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  }

  const popup = shadow.querySelector(".shifra-popup");
  const button = shadow.querySelector(".shifra-btn");
  const closeButton = shadow.querySelector(".shifra-close");
  const title = shadow.querySelector(".shifra-title");
  const subTitle = shadow.querySelector(".shifra-sub");
  const status = shadow.querySelector(".shifra-status");
  const wave = shadow.querySelector(".shifra-wave");
  const userText = shadow.querySelector(".shifra-user-text");
  const aiText = shadow.querySelector(".shifra-ai-text");
  const micArea = shadow.querySelector(".shifra-bottom");
  const mic = shadow.querySelector(".shifra-mic");
  const commandForm = shadow.querySelector(".shifra-command-form");
  const commandInput = shadow.querySelector(".shifra-command-input");

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  // ---------- Helpers ----------

  const idleStatus = () =>
    SpeechRecognition ? "Tap the mic to speak" : "Type your question below";

  const setStatus = (text) => {
    status.textContent = text;
  };

  const setWave = (active) => {
    wave.classList.toggle("active", active);
  };

  const resolveLanguage = () => {
    const language = assistantConfig?.language;
    return language && language !== "auto" ? language : navigator.language || "en-IN";
  };

  const applyTheme = (theme) => {
    currentTheme = normalizeTheme(theme) || "dark";
    popup.className = `shifra-popup theme-${currentTheme}`;
    button.className = `shifra-btn theme-${currentTheme}`;
  };

  const remember = (question, reply) => {
    history.push({ role: "user", text: question }, { role: "assistant", text: reply });
    history.splice(0, Math.max(0, history.length - MAX_HISTORY_TURNS));
  };

  // External sites open in a new tab, same-page sections scroll without a reload.
  const isSafePath = (path) =>
    typeof path === "string" &&
    (path.startsWith("#") ||
      (path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\")) ||
      /^https?:\/\//i.test(path));

  const goTo = (path) => {
    // Never follow javascript:, data: or protocol-relative links.
    if (!isSafePath(path)) {
      console.warn("[Shifra] Ignored an unsafe navigation path:", path);
      return;
    }

    if (/^https?:\/\//i.test(path)) {
      const url = new URL(path);
      if (url.origin === window.location.origin) {
        window.location.href = url.href;
      } else {
        window.open(url.href, "_blank", "noopener");
      }
      return;
    }

    if (path.startsWith("#")) {
      window.location.hash = path;
      return;
    }

    if (path.startsWith("/#") && window.location.pathname === "/") {
      window.location.hash = path.slice(1);
      return;
    }

    window.location.href = path;
  };

  // Text is always shown before speaking, so a muted or voiceless browser still
  // shows the answer. onDone runs when speech ends, fails, or never starts.
  const speak = (text, onDone) => {
    let finished = false;

    const done = () => {
      if (finished) return;
      finished = true;
      setWave(false);
      if (status.textContent === "Speaking…") setStatus(idleStatus());
      onDone?.();
    };

    if (!text || !window.speechSynthesis || assistantConfig?.enablevoice === false) {
      // No voice: still leave a moment to read the reply before navigating.
      setTimeout(done, onDone ? 900 : 0);
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = resolveLanguage();
      utterance.onend = done;
      utterance.onerror = done;

      setStatus("Speaking…");
      window.speechSynthesis.speak(utterance);

      // Some browsers never fire onend when audio is blocked: don't wait forever.
      setTimeout(done, Math.min(15000, 1500 + text.length * 80));
    } catch (error) {
      done();
    }
  };

  const showReply = (text) => {
    aiText.textContent = text;
    setStatus("");
  };

  // ---------- Talking to the assistant ----------

  let busy = false;

  const ask = async (message) => {
    const question = message?.trim();
    if (!question || busy) return;

    busy = true;
    userText.textContent = `You: ${question}`;
    aiText.textContent = "";
    setWave(false);
    setStatus("Thinking…");

    try {
      const response = await fetch(`${BASE_URL}/api/assistant/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          userId,
          currentPath: window.location.pathname,
          history: history.slice(),
          stream: true,
        }),
      });

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await response.json();

        if (!response.ok || !data.success) {
          showReply(data.message || "Sorry, something went wrong. Please try again.");
          setStatus(idleStatus());
          return;
        }

        const reply = data.response || data.aiResponse || "Done";
        showReply(reply);
        remember(question, reply);
        speak(reply, data.action === "navigate" ? () => goTo(data.path) : undefined);
        return;
      }

      // Streamed text: show the words as they arrive.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      setStatus("");

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        aiText.textContent = reply;
      }

      reply = reply.trim() || "Sorry, I didn't catch that. Could you rephrase it?";
      showReply(reply);
      remember(question, reply);
      speak(reply);
    } catch (error) {
      console.warn("[Shifra] Request failed:", error);
      showReply("Sorry, I couldn't connect. Please try again.");
      setStatus(idleStatus());
    } finally {
      busy = false;
    }
  };

  // ---------- Voice input ----------

  let recognition = null;
  let listening = false;

  const startListening = () => {
    if (!SpeechRecognition) {
      commandInput.focus();
      return;
    }

    if (listening) {
      recognition?.stop();
      return;
    }

    window.speechSynthesis?.cancel();

    recognition = new SpeechRecognition();
    recognition.lang = resolveLanguage();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      ask(event.results[0][0].transcript);
    };

    recognition.onerror = (event) => {
      setStatus(
        event.error === "no-speech"
          ? "I didn't hear anything. Try again."
          : event.error === "not-allowed"
            ? "Microphone access is blocked. Type your question below."
            : "Voice input failed. Try again.",
      );
    };

    recognition.onend = () => {
      listening = false;
      setWave(false);
      mic.setAttribute("aria-pressed", "false");
      if (status.textContent === "Listening…") setStatus(idleStatus());
    };

    try {
      recognition.start();
      listening = true;
      userText.textContent = "";
      aiText.textContent = "";
      setWave(true);
      setStatus("Listening…");
      mic.setAttribute("aria-pressed", "true");
    } catch (error) {
      listening = false;
    }
  };

  // ---------- Open / close ----------

  let isPopupOpen = false;

  const setPopupState = (open) => {
    isPopupOpen = open;
    popup.style.display = open ? "block" : "none";
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Close voice assistant" : "Open voice assistant");

    // Lets the host page react, e.g. hide its own assistant preview.
    window.dispatchEvent(new CustomEvent("shifra-popup-toggle", { detail: { open } }));

    if (open) {
      commandInput.focus();
    } else {
      recognition?.abort();
      window.speechSynthesis?.cancel();
    }
  };

  const closeAndReturnFocus = () => {
    setPopupState(false);
    button.focus();
  };

  button.addEventListener("click", () => setPopupState(!isPopupOpen));
  closeButton.addEventListener("click", closeAndReturnFocus);
  mic.addEventListener("click", startListening);

  popup.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      closeAndReturnFocus();
    }
  });

  commandForm.addEventListener("submit", (event) => {
    event.preventDefault();
    ask(commandInput.value);
    commandInput.value = "";
  });

  if (!SpeechRecognition) {
    micArea.hidden = true;
  }

  setStatus(idleStatus());
  setPopupState(false);

  // ---------- Configuration ----------

  const applyConfig = () => {
    if (!assistantConfig) return;

    applyTheme(options.theme || assistantConfig.theme || getStoredTheme());

    title.textContent = `Hello! I'm ${assistantConfig.assistantName || "your assistant"}`;

    // Only greet with the business name when one has been set.
    const businessName = assistantConfig.bussinessName?.trim();
    subTitle.textContent = businessName ? `Welcome to ${businessName}.` : "Your smart voice assistant.";
    subTitle.appendChild(document.createElement("br"));
    subTitle.append("Ask anything about your website.");
  };

  window.addEventListener("shifra-theme-change", (event) => {
    const selectedTheme = normalizeTheme(event?.detail?.theme) || "dark";

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, selectedTheme);
    } catch (error) {
      // Storage can be unavailable (private mode); the theme still applies.
    }

    applyTheme(selectedTheme);
    if (assistantConfig) assistantConfig.theme = selectedTheme;
  });

  const loadAssistant = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/assistant/assistant/${encodeURIComponent(userId)}`);
      const data = await response.json();

      if (!response.ok) {
        console.warn(`[Shifra] Couldn't load assistant "${userId}": ${data?.message || response.status}`);
        return;
      }

      assistantConfig = data.assistant || data.user;
      applyConfig();
    } catch (error) {
      console.warn("[Shifra] Couldn't load assistant settings:", error);
    }
  };

  loadAssistant();
})();
