import express from "express";
import cors from "cors";

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

const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// Initialize database on startup
initializeDatabase();

// Mount routes
app.use("/", oauthRoutes);
app.use("/", chatRoutes);
app.use("/", configRoutes);

// Run cleanup every hour
setInterval(cleanupOldWorkflowStatus, 60 * 60 * 1000);

app.listen(config.PORT, () => {
  console.log(`Express server running on http://localhost:${config.PORT}`);
});
