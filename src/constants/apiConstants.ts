const CLOUD_BASE_URL = "http://0.0.0.0:5678/";
export const BASE_URL = "http://0.0.0.0:5678";
export const BACKEND_URL = "http://localhost:3001";

// Backend endpoints (Express server)
export const BACKEND_CHAT_ENDPOINT = `${BACKEND_URL}/chat`;
export const BACKEND_OAUTH_ENDPOINT = `${BACKEND_URL}/google-oauth`;
export const BACKEND_TTS_ENDPOINT = `${BACKEND_URL}/tts`;
export const BACKEND_TTS_STREAM_ENDPOINT = `${BACKEND_URL}/tts-stream`;
export const BACKEND_CONFIG_ENDPOINT = `${BACKEND_URL}/config/elevenlabs`;
export const BACKEND_CHAT_LOGS_ENDPOINT = `${BACKEND_URL}/chat-logs`;
export const BACKEND_WORKFLOW_STATUS_ENDPOINT = `${BACKEND_URL}/workflow-status`;

// WebSocket endpoint
export const WEBSOCKET_URL = `ws://localhost:3001`;

// Health check
export const BACKEND_HEALTH_ENDPOINT = `${BACKEND_URL}/health`;
