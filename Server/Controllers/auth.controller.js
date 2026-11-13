import { genToken } from "../Configs/token.js";
import User from "../Models/user.model.js";
import jwt from "jsonwebtoken";


export const googleAuth = async (req, res) => {
    try {
        const { name, email, } = req.body;    
        if (!name || !email) {
            return res.status(400).json({ message: "Name and email are required" });
        }       
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({ name, email });
        }
        const token = await genToken(user._id);
        console.log("Generated token:", token); // Debugging log
        res.cookie("token", token, {
            httpOnly: true, 
            secure:false,
            sameSite:"strict",
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });
            return res.status(200).json({ message: "Google authentication successful", user });
    } catch (error) {
        console.log("Google authentication failed", error);
        res.status(500).json({ message: "Google authentication failed" });
    }
}

export const logout = (req, res) => {
    try {
        res.clearCookie("token",{
            httpOnly: true,
            Secure:false,
            sameSite:"strict",
        });
        return res.status(200).json({ message: "Logout successful" });
    } catch (error) {
        res.status(500).json({ message: "Logout failed" });
    }           
};