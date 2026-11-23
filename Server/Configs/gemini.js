import User from "../Models/user.model.js";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// gemini-3.1-flash-lite with minimal thinking answered in ~1.5s in testing,
// versus 17-40s for gemini-3.5-flash with default thinking.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const GEMINI_TIMEOUT_MS = 10000;
// Gemini occasionally stalls or returns a 5xx; if it hasn't started answering
// within this time, the request is retried once inside the overall timeout.
const FIRST_ATTEMPT_MS = 5000;
const RETRYABLE_STATUSES = new Set([500, 502, 503, 504]);
const MAX_OUTPUT_TOKENS = 150;

export class GeminiError extends Error {
  constructor(message, { publicMessage, httpStatus = 502, timeout = false } = {}) {
    super(message);
    this.publicMessage = publicMessage || "Sorry, I couldn't answer that right now. Please try again.";
    this.httpStatus = httpStatus;
    this.timeout = timeout;
  }
}

const setGeminiStatus = async (user, status) => {
  if (user.geminiStatus === status) return;
  user.geminiStatus = status;
  await User.updateOne({ _id: user._id }, { $set: { geminiStatus: status } });
};

const toGeminiError = async (user, response) => {
  let message = `Gemini request failed (${response.status})`;

  try {
    const data = await response.json();
    message = data?.error?.message || message;
  } catch {
    // Body was not JSON; keep the generic message.
  }

  if (response.status === 401 || response.status === 403 || /api key/i.test(message)) {
    await setGeminiStatus(user, "invalid");
    return new GeminiError(message, {
      publicMessage: "This assistant's Gemini API key isn't valid. The owner needs to update it in the Builder.",
      httpStatus: 502,
    });
  }

  if (response.status === 429) {
    await setGeminiStatus(user, "quota_exceeded");
    return new GeminiError(message, {
      publicMessage: "This assistant has reached its Gemini usage limit for now. Please try again later.",
      httpStatus: 429,
    });
  }

  return new GeminiError(message);
};

const timeoutError = () =>
  new GeminiError("Gemini timed out", {
    publicMessage: "Sorry, that took too long. Please try asking again.",
    httpStatus: 504,
    timeout: true,
  });

// Opens the streaming request, retrying once on a stall, network error or 5xx.
// The returned controller aborts the stream when the overall deadline passes.
const openReplyStream = async (url, init, user, deadline) => {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const remaining = deadline - Date.now();
    const budget = attempt === 1 ? Math.min(FIRST_ATTEMPT_MS, remaining) : remaining;

    if (budget < 500) break;

    const controller = new AbortController();
    let timer = setTimeout(() => controller.abort(), budget);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });

      if (response.ok) {
        clearTimeout(timer);
        timer = setTimeout(() => controller.abort(), Math.max(0, deadline - Date.now()));
        return { response, controller, timer };
      }

      clearTimeout(timer);

      if (attempt === 2 || !RETRYABLE_STATUSES.has(response.status)) {
        throw await toGeminiError(user, response);
      }

      await response.body?.cancel();
    } catch (error) {
      clearTimeout(timer);

      if (error instanceof GeminiError) throw error;
      if (attempt === 2) throw error.name === "AbortError" ? timeoutError() : error;
    }
  }

  throw timeoutError();
};

// Streams a reply from Gemini. Yields { text } chunks, or one { navigate: path }
// when Gemini decides to open one of the site's pages (function calling).
export async function* streamGeminiReply({ user, systemPrompt, history = [], message, pagePaths = [] }) {
  const deadline = Date.now() + GEMINI_TIMEOUT_MS;

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [
      ...history.map((turn) => ({
        role: turn.role === "assistant" ? "model" : "user",
        parts: [{ text: turn.text }],
      })),
      { role: "user", parts: [{ text: message }] },
    ],
    generationConfig: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      thinkingConfig: { thinkingLevel: "minimal" },
    },
  };

  if (pagePaths.length) {
    body.tools = [
      {
        functionDeclarations: [
          {
            name: "navigate_to_page",
            description:
              "Open one of this website's pages for the visitor. Call it whenever the visitor wants to go to, see, view, visit or tour a page that is in the list.",
            parameters: {
              type: "object",
              properties: {
                path: {
                  type: "string",
                  enum: pagePaths,
                  description: "Path of the page to open.",
                },
              },
              required: ["path"],
            },
          },
        ],
      },
    ];
  }

  const { response, timer } = await openReplyStream(
    `${GEMINI_BASE_URL}/${GEMINI_MODEL}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": user.geminiApiKey,
      },
      body: JSON.stringify(body),
    },
    user,
    deadline,
  );

  try {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, "\n");

      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const event = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        for (const line of event.split("\n")) {
          if (!line.startsWith("data:")) continue;

          const data = JSON.parse(line.slice(5));
          const parts = data?.candidates?.[0]?.content?.parts || [];

          for (const part of parts) {
            if (part.thought) continue;

            if (part.functionCall?.name === "navigate_to_page") {
              await setGeminiStatus(user, "active");
              yield { navigate: part.functionCall.args?.path };
              return;
            }

            if (part.text) {
              yield { text: part.text };
            }
          }
        }
      }
    }

    await setGeminiStatus(user, "active");
  } catch (error) {
    throw error.name === "AbortError" ? timeoutError() : error;
  } finally {
    clearTimeout(timer);
  }
}
