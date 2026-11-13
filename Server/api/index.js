
import app from "../index.js";
import connectDB from "../configs/Connectdb.js";

export default async function handler(req, res) {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error("Backend error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
}
