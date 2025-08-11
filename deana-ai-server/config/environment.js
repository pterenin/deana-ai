import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load env from deana-ai-server/.env
const envPath = path.join(__dirname, "..", ".env");

console.log("Loading environment from:", envPath);
console.log("File exists:", existsSync(envPath));

// Load environment variables first (falls back to process.env when file missing)
const result = dotenv.config({ path: envPath, debug: true });
console.log("Dotenv result:", result);

try {
  const envContent = readFileSync(envPath, "utf8");
  console.log(
    "Env file content (first 200 chars):",
    envContent.substring(0, 200)
  );
} catch (error) {
  console.error("Error reading env file:", error);
}

// Environment variables
export const config = {
  PORT: process.env.PORT || 3001,
  JWT_SECRET: process.env.JWT_SECRET || "your-super-secret-jwt-key",
  DATABASE_URL:
    process.env.DATABASE_URL || "postgresql://localhost:5432/deana_ai",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI: process.env.REDIRECT_URI,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  NODE_ENV: process.env.NODE_ENV || "development",
  AGENT_BASE_URL: process.env.AGENT_BASE_URL || "http://localhost:3060",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
};

// Debug: Log presence of key vars
console.log("Environment variables check on startup:");
console.log("GOOGLE_CLIENT_ID:", config.GOOGLE_CLIENT_ID ? "SET" : "NOT SET");
console.log(
  "GOOGLE_CLIENT_SECRET:",
  config.GOOGLE_CLIENT_SECRET ? "SET" : "NOT SET"
);
console.log("REDIRECT_URI:", config.REDIRECT_URI ? "SET" : "NOT SET");
console.log("OPENAI_API_KEY:", config.OPENAI_API_KEY ? "SET" : "NOT SET");
