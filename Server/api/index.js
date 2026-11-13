
import app from "../index.js";
import Connectdb from "../Configs/Connectdb.js";

export default async function handler(req, res) {
  try {
    await Connectdb();
    app(req, res);
  } catch (error) {
    console.error("API Handler Error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
