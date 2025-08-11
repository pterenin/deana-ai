import express from "express";
import cors from "cors";
import helmet from "helmet";

// Import configuration and services
import { config } from "./config/environment.js";
import {
  initializeDatabase,
  cleanupOldWorkflowStatus,
} from "./config/database.js";

// Import routes
import oauthRoutes from "./routes/oauth.js";
import chatRoutes from "./routes/chat.js";
import configRoutes from "./routes/config.js";
import ttsRoutes from "./routes/tts.js";

const app = express();

// Security headers
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: false,
    referrerPolicy: { policy: "no-referrer" },
    crossOriginResourcePolicy: { policy: "same-site" },
  })
);

// CORS lock-down (supports comma-separated allowlist)
const allowlist = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // allow non-browser or same-origin
      if (allowlist.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
    optionsSuccessStatus: 204,
  })
);

// JSON body size limit
app.use(express.json({ limit: "256kb" }));

// Initialize database on startup
initializeDatabase();

// Mount routes
app.use("/", oauthRoutes);
app.use("/", chatRoutes);
app.use("/", configRoutes);
app.use("/", ttsRoutes);

// Run cleanup every hour
setInterval(cleanupOldWorkflowStatus, 60 * 60 * 1000);

app.listen(config.PORT, () => {
  console.log(`Express server running on http://localhost:${config.PORT}`);
});
