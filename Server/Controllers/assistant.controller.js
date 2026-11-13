import User from "../Models/user.model.js";
import { generateGeminiResponse } from "../Configs/gemini.js";

export const getAssistantConfig = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-geminiApiKey");

    if (!user) {
      return res.status(404).json({
        message: "failed to get user",
      });
    }

    return res.status(200).json({
      message: "Assistant Config data",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: `Assistant Config failed ${error}`,
    });
  }
};

export const askAssistant = async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message || !userId) {
      return res.status(400).json({
        message: "Message and UserId are required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User is not found",
      });
    }

    if (!user.geminiApiKey) {
      return res.status(404).json({
        message: "gemini api key is not added",
      });
    }

    if (user.plan === "free" && user.totalMessages >= user.requestLimit) {
      return res.status(400).json({
        message: "Free limit reached",
      });
    }

    if (user.plan === "pro" && new Date(user.proExpiresAt) < new Date()) {
      user.plan = "free";

      await user.save();

      return res.status(400).json({
        message: "Pro plan expired",
      });
    }

    const cleanMessage = message
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .trim();

    if (user.enableNavigation) {
      const matchedPage = user.pages.find((page) =>
        page.keywords?.some((keyword) =>
          cleanMessage.includes(keyword.toLowerCase()),
        ),
      );

      console.log("Voice:", cleanMessage);
      console.log("Matched Page:", matchedPage);

      if (matchedPage) {
        if (req.body.currentPath === matchedPage.path) {
          return res.json({
            success: true,
            response: `${matchedPage.name} already open`,
          });
        }

        return res.json({
          success: true,
          action: "navigate",
          path: matchedPage.path,
          response: `Opening ${matchedPage.name}`,
        });
      }
    }
    const prompt = `
You are ${user.assistantName}.

Bussiness Name:
${user.bussinessName}

Bussiness Type:
${user.bussinessType}

Bussiness Description:
${user.bussinessDescription}

Assistant Tone:
${user.tone}

Rules:
- Keep replies under 15 words
- Give fast direct responses
- Talk naturally
- Behave like smart voice assistant
- Avoid long explanations
- Keep responses short for quick voice playback

User Question:
${message}
`;

    const aiResponse = await generateGeminiResponse({
      prompt,
      apikey: user.geminiApiKey,
      user,
    });

    if (user.plan === "free") {
      user.totalMessages += 1;
      await user.save();
    }

    return res.json({
      success: true,
      aiResponse,
    });
  } catch (error) {
  if (error.message.includes("quota")) {
    return res.status(429).json({
      success: false,
      message: "Gemini API quota exceeded. Please try again later or use another API key.",
    });
  }

  return res.status(500).json({
    success: false,
    message: error.message,
  });
}
};
