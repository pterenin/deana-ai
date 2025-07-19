import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { createServer } from "http";

// Import configuration and services
import { config } from "./config/environment.js";
import {
  initializeDatabase,
  cleanupOldWorkflowStatus,
} from "./config/database.js";
import { handleWebSocketConnection } from "./services/websocketService.js";

// Import routes
import oauthRoutes from "./routes/oauth.js";
import chatRoutes from "./routes/chat.js";
import ttsRoutes from "./routes/tts.js";
import configRoutes from "./routes/config.js";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database on startup
initializeDatabase();

// Mount routes
app.use("/", oauthRoutes);
app.use("/", chatRoutes);
app.use("/", ttsRoutes);
app.use("/", configRoutes);

// WebSocket endpoint for real-time features
wss.on("connection", handleWebSocketConnection);

// Run cleanup every hour
setInterval(cleanupOldWorkflowStatus, 60 * 60 * 1000);

server.listen(config.PORT, () => {
  console.log(`Express server running on http://localhost:${config.PORT}`);
  console.log(`WebSocket server running on ws://localhost:${config.PORT}`);
});
