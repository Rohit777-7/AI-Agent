import User from "../Models/user.model.js";
import { hostnameOf } from "../Configs/hostname.js";
import { toClientUser } from "../Configs/clientUser.js";
import { isSafePagePath } from "../Configs/pagePath.js";

const LANGUAGES = [
  "auto", "en-IN", "en-US", "en-GB", "hi-IN", "mr-IN", "bn-IN", "ta-IN", "te-IN",
  "gu-IN", "kn-IN", "ml-IN", "pa-IN", "ur-IN", "es-ES", "fr-FR", "de-DE", "ar-SA",
];
const THEMES = ["light", "dark", "glass", "neon", "ocean", "sunset", "rose", "midnight"];
const TONES = ["Formal", "Informal", "Friendly", "Professional"];

const LIMITS = {
  assistantName: 60,
  bussinessName: 100,
  bussinessType: 100,
  bussinessDescription: 2000,
  pages: 30,
  pageName: 60,
  pagePath: 300,
  keywords: 10,
  keyword: 60,
  geminiApiKey: 200,
  allowedDomains: 20,
};

class ValidationError extends Error {}

// Accepts an array or a comma/space separated string; keeps unique hostnames.
const normalizeDomains = (value) => {
  const items = Array.isArray(value) ? value : String(value || "").split(/[\s,]+/);
  const hosts = items
    .map(hostnameOf)
    .filter((host) => host === "localhost" || /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host));

  return [...new Set(hosts)].slice(0, LIMITS.allowedDomains);
};

const isValidGeminiApiKey = (value) => /^[A-Za-z0-9_-]{20,200}$/.test(value);

const readText = (value, field, label, { required = false } = {}) => {
  if (value === undefined || value === null) {
    if (required) throw new ValidationError(`${label} is required.`);
    return "";
  }

  if (typeof value !== "string") {
    throw new ValidationError(`${label} must be text.`);
  }

  const text = value.trim();

  if (required && !text) {
    throw new ValidationError(`${label} is required.`);
  }

  if (text.length > LIMITS[field]) {
    throw new ValidationError(`${label} must be ${LIMITS[field]} characters or fewer.`);
  }

  return text;
};

const readPages = (pages) => {
  if (pages === undefined || pages === null) return [];

  if (!Array.isArray(pages)) {
    throw new ValidationError("Pages must be a list.");
  }

  if (pages.length > LIMITS.pages) {
    throw new ValidationError(`You can add up to ${LIMITS.pages} pages.`);
  }

  return pages.map((page, index) => {
    if (!page || typeof page !== "object") {
      throw new ValidationError(`Page ${index + 1} is invalid.`);
    }

    const name = readText(page.name, "pageName", `Page ${index + 1} name`, { required: true });
    const path = readText(page.path, "pagePath", `Page "${name}" path`, { required: true });

    if (!isSafePagePath(path)) {
      throw new ValidationError(
        `Page "${name}" path must start with "/" or "#", or be an http(s):// link.`,
      );
    }

    const rawKeywords = page.pageKeywords ?? page.keywords ?? [];

    if (!Array.isArray(rawKeywords)) {
      throw new ValidationError(`Page "${name}" keywords must be a list.`);
    }

    const keywords = [
      ...new Set(
        rawKeywords
          .filter((keyword) => typeof keyword === "string")
          .map((keyword) => keyword.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];

    if (keywords.length > LIMITS.keywords) {
      throw new ValidationError(`Page "${name}" can have up to ${LIMITS.keywords} keywords.`);
    }

    if (keywords.some((keyword) => keyword.length > LIMITS.keyword)) {
      throw new ValidationError(`Keywords must be ${LIMITS.keyword} characters or fewer.`);
    }

    return { name, path, keywords };
  });
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "Failed to get current user",
      });
    }

    return res.status(200).json(toClientUser(user));
  } catch (error) {
    console.error("getCurrentUser failed:", error.message);
    return res.status(500).json({
      message: "Failed to get current user",
    });
  }
};

export const saveAssistant = async (req, res) => {
  try {
    const body = req.body || {};

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "Failed to get current user",
      });
    }

    const tone = body.tone ?? "Friendly";

    if (!TONES.includes(tone)) {
      throw new ValidationError(`Tone must be one of: ${TONES.join(", ")}.`);
    }

    const theme = typeof body.theme === "string" ? body.theme.toLowerCase() : "dark";

    const assistantName = readText(body.assistantName, "assistantName", "Assistant name");
    const bussinessName = readText(body.bussinessName ?? body.businessName, "bussinessName", "Business name");
    const bussinessType = readText(body.bussinessType ?? body.businessType, "bussinessType", "Business type");
    const bussinessDescription = readText(
      body.bussinessDescription ?? body.businessDescription,
      "bussinessDescription",
      "Business description",
    );
    const pages = readPages(body.pages);

    // An empty key field means "keep the saved key".
    const geminiApiKey = readText(body.geminiApiKey, "geminiApiKey", "Gemini API key");

    if (geminiApiKey && !isValidGeminiApiKey(geminiApiKey)) {
      throw new ValidationError("Please enter a valid Gemini API key, not code or text.");
    }

    user.assistantName = assistantName || "ShifraAI";
    user.bussinessName = bussinessName;
    user.bussinessType = bussinessType;
    user.bussinessDescription = bussinessDescription;
    user.tone = tone;
    user.theme = THEMES.includes(theme) ? theme : "dark";
    user.pages = pages;

    if (geminiApiKey) {
      user.geminiApiKey = geminiApiKey;
      user.geminiStatus = "active";
    }

    if (body.allowedDomains !== undefined) {
      user.allowedDomains = normalizeDomains(body.allowedDomains);
    }

    if (body.language !== undefined) {
      user.language = LANGUAGES.includes(body.language) ? body.language : "auto";
    }

    user.isSetupComplete = true;

    await user.save();

    return res.status(200).json({
      message: "Assistant saved successfully",
      user: toClientUser(user),
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }

    console.error("Save assistant failed:", error.message);
    return res.status(500).json({
      message: "Failed to save assistant",
    });
  }
};
