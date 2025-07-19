import jwt from "jsonwebtoken";
import { config } from "../config/environment.js";

// JWT middleware
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, config.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// Generate JWT token
export const generateToken = (payload) => {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: "7d" });
};
