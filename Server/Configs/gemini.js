import User from "../Models/user.model.js";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Fast "lite" models with minimal thinking answer in ~1s. A single model is
// sometimes overloaded ("high demand") for a while, so each retry moves to the
// next model in this list. GEMINI_MODEL, if set, is tried first.
const GEMINI_MODELS = [
  ...new Set(
    [process.env.GEMINI_MODEL, "gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"].filter(Boolean),
  ),
];
const GEMINI_TIMEOUT_MS = 10000;
// If a model hasn't started answering within this time, the next one is tried.
const ATTEMPT_MS = 3500;
// Overloaded or unavailable models; a bad key (401/403) is not retried.
const RETRYABLE_STATUSES = new Set([404, 429, 500, 502, 503, 504]);
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

// Opens the streaming request, moving to the next model on a stall, network
// error, overload or 5xx. A model only counts as answering once the first piece
// of the reply arrives, since a busy model can send headers and then stall.
// The returned timer aborts the stream when the overall deadline passes.
const openReplyStream = async (init, user, deadline) => {
  let lastError = null;

  for (let index = 0; index < GEMINI_MODELS.length; index++) {
    const isLast = index === GEMINI_MODELS.length - 1;
    const remaining = deadline - Date.now();
    const budget = isLast ? remaining : Math.min(ATTEMPT_MS, remaining);

    if (budget < 500) break;

    const url = `${GEMINI_BASE_URL}/${GEMINI_MODELS[index]}:streamGenerateContent?alt=sse`;
    const controller = new AbortController();
    let timer = setTimeout(() => controller.abort(), budget);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });

      if (!response.ok) {
        clearTimeout(timer);

        if (isLast || !RETRYABLE_STATUSES.has(response.status)) {
          throw await toGeminiError(user, response);
        }

        lastError = new GeminiError(`${GEMINI_MODELS[index]} returned ${response.status}`);
        await response.body?.cancel().catch(() => {});
        continue;
      }

      const reader = response.body.getReader();
      const first = await reader.read();

      clearTimeout(timer);
      timer = setTimeout(() => controller.abort(), Math.max(0, deadline - Date.now()));
      return { reader, first, timer };
    } catch (error) {
      clearTimeout(timer);

      if (error instanceof GeminiError) throw error;

      lastError = error.name === "AbortError" ? timeoutError() : error;
      controller.abort();
    }
  }

  throw lastError || timeoutError();
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

  const { reader, first, timer } = await openReplyStream(
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
    const decoder = new TextDecoder();
    let buffer = "";
    let next = first;

    for (;;) {
      const { value, done } = next || (await reader.read());
      next = null;
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
