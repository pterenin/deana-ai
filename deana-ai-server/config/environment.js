import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", "oauth.env");

console.log("Loading environment from:", envPath);
console.log("File exists:", existsSync(envPath));

// Load environment variables first
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
  N8N_BASE_URL: process.env.N8N_BASE_URL || "http://localhost:5678",
  N8N_WORKFLOW_ID: process.env.N8N_WORKFLOW_ID || "Nc4rOBvy6v75ngPL",
  PORT: process.env.PORT || 3001,
  JWT_SECRET: process.env.JWT_SECRET || "your-super-secret-jwt-key",
  DATABASE_URL:
    process.env.DATABASE_URL || "postgresql://localhost:5432/deana_ai",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI: process.env.REDIRECT_URI,
  N8N_API_KEY: process.env.N8N_API_KEY,
  NODE_ENV: process.env.NODE_ENV || "development",
};

// Derived URLs
export const urls = {
  N8N_WEBHOOK_URL: `${config.N8N_BASE_URL}/webhook/request-assistence`,
  N8N_CREDENTIALS_URL: `${config.N8N_BASE_URL}/send-credentials`,
  N8N_REST_URL: `${config.N8N_BASE_URL}/api/v1`,
};

// Debug: Log environment variables on startup
console.log("Environment variables check on startup:");
console.log("GOOGLE_CLIENT_ID:", config.GOOGLE_CLIENT_ID ? "SET" : "NOT SET");
console.log(
  "GOOGLE_CLIENT_SECRET:",
  config.GOOGLE_CLIENT_SECRET ? "SET" : "NOT SET"
);
console.log("REDIRECT_URI:", config.REDIRECT_URI ? "SET" : "NOT SET");
console.log("N8N_BASE_URL:", config.N8N_BASE_URL);
console.log("N8N_WORKFLOW_ID:", config.N8N_WORKFLOW_ID);
