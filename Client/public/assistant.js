(function () {
  // userData

  const script = document.currentScript;

  const userId = script?.dataset?.userId;

  const THEME_STORAGE_KEY = "shifra-theme";

  const SUPPORTED_THEMES = ["light", "dark", "glass", "neon", "ocean", "sunset", "rose", "midnight"];

  const normalizeTheme = (value) => {
    const themeValue = typeof value === "string" ? value.toLowerCase() : "dark";

    return SUPPORTED_THEMES.includes(themeValue) ? themeValue : "dark";
  };

  const getStoredTheme = () => {
    try {
      return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
    } catch (error) {
      return "dark";
    }
  };

  const theme = getStoredTheme();

  let assistantConfig = null;

  // load CSS

  const link = document.createElement("link");

  link.rel = "stylesheet";

  link.href = "http://localhost:5173/assistant.css";

  document.head.appendChild(link);

  // Create PopUp

  const popup = document.createElement("div");

  popup.className = `shifra-popup theme-${theme}`;

  popup.innerHTML = `
    <div class="shifra-overlay"></div>

    <div class="shifra-content">
      <button class="shifra-close" type="button" aria-label="Close assistant">
        &times;
      </button>

        <div class="shifra-top">

            <div class="shifra-orb-wrap">

                <div class="shifra-orb-glow"></div>

                <div class="shifra-orb"></div>

            </div>

            <h2 class="shifra-title">
                Hello! I'm Shifra AI
            </h2>

            <p class="shifra-sub">
                Your smart voice assistant.
                <br />
                Ask anything about your website.
            </p>

            <div class="shifra-status">
                Tap button to Speak
            </div>

            <div class="shifra-wave">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
            </div>

            <!-- User Text -->
            <div class="shifra-user-text">
            </div>

            <!-- AI Text -->
            <div class="shifra-ai-text">
            </div>

            <form class="shifra-command-form">
              <input
                class="shifra-command-input"
                type="text"
                placeholder="Tell me what to do..."
                autocomplete="off"
              />

              <button class="shifra-command-btn" type="submit">
                Send
              </button>
            </form>

        </div>

        <div class="shifra-bottom">

            <button class="shifra-mic">

                <img
                    src="http://localhost:5173/mic.svg"
                    alt="mic"
                    class="shifra-mic-icon"
                />

            </button>

        </div>

    </div>
`;

  document.body.appendChild(popup);

  const button = document.createElement("button");

  button.className = `shifra-btn theme-${theme}`;

  button.innerHTML = `
    <span class="shifra-btn-mark"></span>
    <img
        src="http://localhost:5173/LOGO.png"
        alt="logo"
    />
`;

  document.body.appendChild(button);

  let isPopupOpen = false;

  const setPopupState = (open) => {
    isPopupOpen = open;
    popup.style.display = open ? "block" : "none";

    if (open) {
      commandInput?.focus();
    }
  };

  setPopupState(false);

  // load Assistant

  const loadAssistant = async () => {
    try {
      const res = await fetch(
        `http://localhost:8000/api/assistant/assistant/${userId}`,
      );

      const data = await res.json();

      console.log(data);

      if (data) {
        assistantConfig = data.user;
        applyConfig();
      }
    } catch (error) {
      console.log("Assistant Load Error:", error);
    }
  };

  const applyConfig = () => {
    if (!assistantConfig) return;

    const selectedTheme = normalizeTheme(
      assistantConfig.theme || getStoredTheme(),
    );

    popup.className = `shifra-popup theme-${selectedTheme}`;

    button.className = `shifra-btn theme-${selectedTheme}`;

    const title = popup.querySelector(".shifra-title");

    title.innerHTML = `Hello! I'm ${assistantConfig.assistantName}`;

    const subTitle = popup.querySelector(".shifra-sub");

    subTitle.innerHTML = `
        Welcome to
        ${assistantConfig.bussinessName}.
        <br />
        Ask anything about your website.
    `;
  };

  window.addEventListener("shifra-theme-change", (event) => {
    const selectedTheme = normalizeTheme(event?.detail?.theme);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, selectedTheme);
    } catch (error) {
      console.log(error);
    }

    if (assistantConfig) {
      assistantConfig.theme = selectedTheme;
      applyConfig();
    }
  });

  loadAssistant();

  const status = popup.querySelector(".shifra-status");

  const wave = popup.querySelector(".shifra-wave");

  const userText = popup.querySelector(".shifra-user-text");

  const aiText = popup.querySelector(".shifra-ai-text");

  const commandForm = popup.querySelector(".shifra-command-form");

  const commandInput = popup.querySelector(".shifra-command-input");

  const closeButton = popup.querySelector(".shifra-close");

  const mic = popup.querySelector(".shifra-mic");

  // text-speech

  const speak = (text) => {
    window.speechSynthesis.cancel();

    // Show AI response
    aiText.innerText = text;

    status.innerText = "AI Speaking...";

    const speech = new SpeechSynthesisUtterance(text);

    speech.lang = "hi-IN";

    speech.rate = 1;

    speech.pitch = 1;

    speech.volume = 1;

    // Voice end
    speech.onend = () => {
      status.innerText = "Tap button to Speak";

      wave.style.opacity = "0";
    };

    // Start speaking
    window.speechSynthesis.speak(speech);
  };

  const submitAssistantMessage = async (message) => {
    const cleanMessage = message?.trim();

    if (!cleanMessage) {
      return;
    }

    userText.innerText = "You: " + cleanMessage;
    aiText.innerText = "";
    status.innerText = "Thinking...";
    wave.style.opacity = "0";

    try {
      const res = await fetch("http://localhost:8000/api/assistant/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: cleanMessage,
          userId,
          currentPath: window.location.pathname,
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.action === "navigate") {
          speak(data.response);

          setTimeout(() => {
            window.location.href = data.path;
          }, 1500);
        } else {
          speak(data.aiResponse || data.response || "Done");
        }
      } else {
        status.innerText = data.message || "Unable to complete task";
      }
    } catch (err) {
      console.log(err);
      status.innerText = "Something went wrong";
    }
  };

 const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();

  recognition.lang = "en-IN";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let isListening = false;

  const startListening = () => {
    if (isListening) return;

    isListening = true;

    wave.style.opacity = "1";
    status.innerText = "Listening...";
    userText.innerText = "";
    aiText.innerText = "";

    try {
      recognition.start();
    } catch (err) {
      console.log(err);
      isListening = false;
    }
  };

  button.onclick = () => {
    setPopupState(!isPopupOpen);
  };

  closeButton.onclick = () => setPopupState(false);

  popup.querySelector(".shifra-overlay").onclick = () => setPopupState(false);

  commandForm.onsubmit = (event) => {
    event.preventDefault();

    submitAssistantMessage(commandInput.value);

    commandInput.value = "";
  };

  mic.onclick = startListening;

  recognition.onstart = () => {
    console.log("Recognition Started");
  };

  recognition.onresult = async (e) => {
    console.log("RESULT RECEIVED");

    const text = e.results[0][0].transcript;

    console.log("VOICE =", text);

    userText.innerText = "You: " + text;

    recognition.stop();

    status.innerText = "Thinking...";

    try {
      const res = await fetch("http://localhost:8000/api/assistant/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          userId,
          currentPath: window.location.pathname,
        }),
      });

      const data = await res.json();

      console.log(data);

      if (data.success) {
        if (data.action === "navigate") {
          speak(data.response);

          setTimeout(() => {
            window.location.href = data.path;
          }, 1500);
        } else {
          speak(data.aiResponse);
        }
      } else {
        speak(data.message);
      }
    } catch (err) {
      console.log(err);
      speak("Something went wrong");
    }
  };

  recognition.onerror = (event) => {
    console.log("Speech Error:", event.error);

    isListening = false;

    status.innerText =
      event.error === "no-speech"
        ? "No speech detected. Try again."
        : "Speech input failed. Try again.";
    wave.style.opacity = "0";
  };

  recognition.onend = () => {
    console.log("Recognition Ended");

    isListening = false;

    wave.style.opacity = "0";

    if (status.innerText === "Listening...") {
      status.innerText = "Tap to Speak";
    }
  };
} else {
  status.innerText = "Speech Recognition not supported";
}
})();
