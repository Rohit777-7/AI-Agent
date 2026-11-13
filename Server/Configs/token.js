import jwt from "jsonwebtoken";

export const genToken = (userId) => {
   try {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "1d" });
    return token;
   } catch (error) {
    console.log("Error generating token", error);
   }    
}