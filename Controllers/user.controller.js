import User from "../Models/user.model.js";

const toClientUser = (user) =>
    typeof user.toClientObject === "function" ? user.toClientObject() : user;

const isValidGeminiApiKey = (value) =>
  typeof value === "string" &&
  value.trim() !== "" &&
  !/\s|import\s|from\s|;|`|"|'/.test(value);

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
    return res.status(500).json({
      message: `getCurrentUser error ${error.message}`,
    });
  }
};

export const saveAssistant = async (req, res) => {
  try {
    const {
      assistantName,
      bussinessName,
      businessName,
      bussinessType,
      businessType,
      bussinessDescription,
      businessDescription,
      tone,
      theme,
      geminiApiKey,
      pages,
    } = req.body;

    const user = await User.findById(req.userId);
    const normalizedTheme =
      typeof theme === "string" ? theme.toLowerCase() : "dark";
    const allowedThemes = ["light", "dark", "glass", "neon", "ocean", "sunset", "rose", "midnight"];

    if (!user) {
      return res.status(404).json({
        message: "Failed to get current user",
      });
    }

    user.assistantName = assistantName;
    user.bussinessName = bussinessName ?? businessName ?? "";
    user.bussinessType = bussinessType ?? businessType ?? "";
    user.bussinessDescription =
      bussinessDescription ?? businessDescription ?? "";
    user.tone = tone;
    user.theme = allowedThemes.includes(normalizedTheme) ? normalizedTheme : "dark";

    if (geminiApiKey && !isValidGeminiApiKey(geminiApiKey)) {
      return res.status(400).json({
        message: "Please enter a valid Gemini API key, not code or text.",
      });
    }

    if (geminiApiKey) {
      user.geminiApiKey = geminiApiKey.trim();
    }

    user.geminiStatus = "active";
    user.pages = (pages || []).map((page) => ({
      name: (page.name || "").trim(),
      path: (page.path || "").trim(),
      keywords: page.pageKeywords || page.keywords || [],
    }));

    user.isSetupComplete = true;

    await user.save();

    return res.status(200).json({
      message: "Assistant saved successfully",
      user: toClientUser(user),
    });
  }catch (error) {
  return res.status(500).json({
    message: `Failed to save Assistant ${error}`,
  });
}

};