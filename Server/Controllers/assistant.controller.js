import mongoose from "mongoose";
import User from "../Models/user.model.js";
import { streamGeminiReply, GeminiError } from "../Configs/gemini.js";
import { consumeRateLimit, getClientIp } from "../Configs/rateLimit.js";
import { hostnameOf, hostMatchesDomain } from "../Configs/hostname.js";
import { isSafePagePath } from "../Configs/pagePath.js";

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_TURNS = 6;
const IP_LIMIT_PER_MINUTE = 20;
const ASSISTANT_LIMIT_PER_DAY = 500;

const NAVIGATION_INTENT =
  /\b(go|goto|take|open|navigate|show|move|bring|switch|visit|jump|redirect|give|start|begin|view|see|tour|lets)\b/;

const normalizeText = (text = "") =>
  text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const containsPhrase = (text, phrase) =>
  Boolean(phrase) && new RegExp(`\\b${escapeRegExp(phrase)}\\b`).test(text);

// Finds the page a visitor is asking for. Keywords always count; the page name
// counts when the message clearly asks to go somewhere ("take me to home").
// "home page" also matches "homepage", and the longest match wins.
export const findMatchingPage = (pages = [], message = "") => {
  const text = normalizeText(message);
  const wantsToNavigate = NAVIGATION_INTENT.test(text);
  let best = null;

  for (const page of pages) {
    const phrases = (page.keywords || []).map(normalizeText).filter(Boolean);
    const name = normalizeText(page.name);

    if (wantsToNavigate && name) {
      phrases.push(name);
    }

    for (const phrase of phrases) {
      const matched =
        containsPhrase(text, phrase) ||
        (phrase.includes(" ") && containsPhrase(text, phrase.replace(/ /g, "")));

      if (matched && (!best || phrase.length > best.length)) {
        best = { page, length: phrase.length };
      }
    }
  }

  return best?.page || null;
};

// The ShifraAI app itself (Chat studio, home preview, local development) may
// always call the assistant; other sites must be on the owner's allow-list.
const isOriginAllowed = (req, user) => {
  const allowed = (user.allowedDomains || []).map(hostnameOf).filter(Boolean);
  if (!allowed.length) return true;

  const originHost = hostnameOf(req.headers.origin || req.headers.referer || "");
  if (!originHost) return false;

  const appHosts = [
    process.env.CLIENT_URL,
    req.headers["x-forwarded-host"],
    req.headers.host,
  ].map(hostnameOf);

  if (originHost === "localhost" || originHost === "127.0.0.1" || appHosts.includes(originHost)) {
    return true;
  }

  return allowed.some((domain) => hostMatchesDomain(originHost, domain));
};

// Atomically takes one reply from the plan, so parallel requests can't slip
// past the limit. Pro is unlimited but still counted.
const reserveReply = (userId) =>
  User.findOneAndUpdate(
    {
      _id: userId,
      $or: [{ plan: "pro" }, { $expr: { $lt: ["$totalMessages", "$requestLimit"] } }],
    },
    { $inc: { totalMessages: 1 } },
    { returnDocument: "after", projection: { _id: 1 } },
  );

const refundReply = (userId) =>
  User.updateOne({ _id: userId, totalMessages: { $gt: 0 } }, { $inc: { totalMessages: -1 } });

const sendNavigation = (res, page, currentPath) => {
  if (currentPath === page.path) {
    return res.json({ success: true, response: `${page.name} is already open` });
  }

  return res.json({
    success: true,
    action: "navigate",
    path: page.path,
    response: `Opening ${page.name}`,
  });
};

const cleanHistory = (history) =>
  Array.isArray(history)
    ? history
        .filter(
          (turn) =>
            turn &&
            (turn.role === "user" || turn.role === "assistant") &&
            typeof turn.text === "string" &&
            turn.text.trim(),
        )
        .slice(-MAX_HISTORY_TURNS)
        .map((turn) => ({ role: turn.role, text: turn.text.trim().slice(0, MAX_MESSAGE_LENGTH) }))
    : [];

const buildSystemPrompt = (user, pages) => {
  const pageList = pages.map((page) => `${page.name} (${page.path})`).join(", ");

  return `You are ${user.assistantName || "a website assistant"}, the voice assistant on the website of ${user.bussinessName || "this business"}.

Business type: ${user.bussinessType || "not specified"}
About the business: ${user.bussinessDescription || "not specified"}
Tone: ${user.tone || "Friendly"}

Rules:
- Reply in the same language the visitor uses.
- Keep replies under 30 words, in short natural sentences that sound good spoken aloud.
- Only state facts about this business that are given above. If you don't know, say so briefly.
${
  pages.length
    ? `- You can open these pages of the website: ${pageList}. When the visitor wants to go to, see or tour one of them, call navigate_to_page with its path.`
    : "- This website has no pages you can open for the visitor."
}
- Never claim you opened or are opening a page unless you called navigate_to_page.`;
};

export const getAssistantConfig = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(404).json({ success: false, message: "failed to get user" });
    }

    // Public endpoint: only what the widget needs to display itself.
    const user = await User.findById(userId)
      .select("assistantName bussinessName theme tone enablevoice enableNavigation pages language")
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "failed to get user" });
    }

    const assistant = {
      assistantName: user.assistantName,
      bussinessName: user.bussinessName,
      theme: user.theme,
      tone: user.tone,
      enablevoice: user.enablevoice,
      enableNavigation: user.enableNavigation,
      language: user.language || "auto",
      pages: (user.pages || [])
        .filter((page) => isSafePagePath(page.path))
        .map(({ name, path, keywords }) => ({ name, path, keywords })),
    };

    // `user` is kept as an alias for widgets loaded before this change.
    return res.status(200).json({ success: true, assistant, user: assistant });
  } catch (error) {
    console.error("Assistant config failed:", error);
    return res.status(500).json({ success: false, message: "Assistant config failed" });
  }
};

export const askAssistant = async (req, res) => {
  try {
    const { message, userId, currentPath, history, stream } = req.body || {};
    const text = typeof message === "string" ? message.trim() : "";

    if (!text || !userId) {
      return res.status(400).json({ success: false, message: "Message and UserId are required" });
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Please keep your message under ${MAX_MESSAGE_LENGTH} characters.`,
      });
    }

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(404).json({ success: false, message: "User is not found" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User is not found" });
    }

    if (!isOriginAllowed(req, user)) {
      return res.status(403).json({
        success: false,
        message: "This assistant isn't enabled for this website.",
      });
    }

    const [perVisitor, perDay] = await Promise.all([
      consumeRateLimit(`ip:${getClientIp(req)}:${user._id}`, IP_LIMIT_PER_MINUTE, 60 * 1000),
      consumeRateLimit(`assistant:${user._id}`, ASSISTANT_LIMIT_PER_DAY, 24 * 60 * 60 * 1000),
    ]);

    if (!perVisitor.allowed || !perDay.allowed) {
      const limit = perVisitor.allowed ? perDay : perVisitor;
      res.set("Retry-After", String(limit.retryAfterSeconds));

      return res.status(429).json({
        success: false,
        message: perVisitor.allowed
          ? "This assistant has reached its daily message limit. Please try again tomorrow."
          : "You're sending messages too quickly. Please wait a moment.",
      });
    }

    // An expired Pro plan falls back to Free instead of blocking the visitor.
    if (user.plan === "pro" && user.proExpiresAt && new Date(user.proExpiresAt) < new Date()) {
      user.plan = "free";
      await User.updateOne({ _id: user._id }, { $set: { plan: "free" } });
    }

    const pages = user.enableNavigation
      ? (user.pages || []).filter((page) => page.name && isSafePagePath(page.path))
      : [];

    // Fast path: no AI needed, so it costs nothing and isn't counted.
    const matchedPage = findMatchingPage(pages, text);

    if (matchedPage) {
      return sendNavigation(res, matchedPage, currentPath);
    }

    if (!user.geminiApiKey) {
      return res.status(503).json({
        success: false,
        message: "This assistant isn't connected to Gemini yet.",
      });
    }

    const reserved = await reserveReply(user._id);

    if (!reserved) {
      return res.status(402).json({
        success: false,
        message: `This assistant has used all ${user.requestLimit} free AI replies. Upgrade to Pro for unlimited replies.`,
      });
    }

    const wantsStream = stream === true;
    let reply = "";

    try {
      const replyStream = streamGeminiReply({
        user,
        systemPrompt: buildSystemPrompt(user, pages),
        history: cleanHistory(history),
        message: text,
        pagePaths: [...new Set(pages.map((page) => page.path))],
      });

      for await (const chunk of replyStream) {
        if (chunk.navigate) {
          const page = pages.find((candidate) => candidate.path === chunk.navigate);

          if (page && !res.headersSent) {
            return sendNavigation(res, page, currentPath);
          }

          continue;
        }

        reply += chunk.text;

        if (wantsStream) {
          if (!res.headersSent) {
            res.status(200);
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.setHeader("Cache-Control", "no-cache, no-transform");
            res.setHeader("X-Accel-Buffering", "no");
            res.flushHeaders();
          }

          res.write(chunk.text);
        }
      }
    } catch (error) {
      console.error("Gemini error:", error.message);

      if (!reply) {
        await refundReply(user._id);
      }

      if (res.headersSent) {
        return res.end();
      }

      return res.status(error instanceof GeminiError ? error.httpStatus : 502).json({
        success: false,
        message:
          error instanceof GeminiError
            ? error.publicMessage
            : "Sorry, I couldn't answer that right now. Please try again.",
      });
    }

    if (!reply.trim()) {
      await refundReply(user._id);

      if (res.headersSent) {
        return res.end();
      }

      return res.status(502).json({
        success: false,
        message: "Sorry, I didn't catch that. Could you rephrase it?",
      });
    }

    if (wantsStream) {
      return res.end();
    }

    return res.json({ success: true, aiResponse: reply.trim() });
  } catch (error) {
    console.error("Ask assistant failed:", error);

    if (res.headersSent) {
      return res.end();
    }

    return res.status(500).json({
      success: false,
      message: "Sorry, something went wrong. Please try again.",
    });
  }
};
