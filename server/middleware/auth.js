import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies?.token ;

    if (!token) {
      return res.status(401).json({ error: "Please authenticate" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    const user = await User.findById(decoded._id);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: "Please authenticate" });
  }
};
