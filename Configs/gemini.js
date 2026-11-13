const Gemini_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent";

export const generateGeminiResponse = async ({ prompt, apikey, user }) => {
  try {
    if (!apikey) {
      throw new Error("Gemini API key is missing.");
    }

    console.log("Using Gemini API Key:", apikey);

    const response = await fetch(`${Gemini_URL}?key=${apikey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    // ===========================
    // HANDLE ERRORS
    // ===========================
    if (!response.ok) {
      let errData = {};

      try {
        errData = await response.json();
      } catch {
        errData = {
          error: {
            message: await response.text(),
          },
        };
      }

      console.log(
        "Gemini Error Response:",
        JSON.stringify(errData, null, 2)
      );

      if (response.status === 400 || response.status === 401) {
        user.geminiStatus = "invalid";
        await user.save();
      }

      if (response.status === 429) {
        user.geminiStatus = "quota_exceeded";
        await user.save();
      }

      throw new Error(
        errData.error?.message || "Unknown Gemini API Error"
      );
    }

    // ===========================
    // SUCCESS
    // ===========================
    const data = await response.json();

    console.log(
      "Gemini Success:",
      JSON.stringify(data, null, 2)
    );

    user.geminiStatus = "active";
    await user.save();

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    return text.trim();
  } catch (error) {
    console.error("Gemini Fetch Error:");
    console.error(error);

    throw error;
  }
};