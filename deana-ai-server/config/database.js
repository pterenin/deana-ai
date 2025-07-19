import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", "oauth.env");

// Load environment variables
dotenv.config({ path: envPath });

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://localhost:5432/deana_ai";

// PostgreSQL connection
export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// Database initialization
export async function initializeDatabase() {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        google_user_id TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        name TEXT,
        avatar_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create user_google_tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_google_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        google_user_id TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_type TEXT NOT NULL,
        scope TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        n8n_calendar_credential_id TEXT,
        n8n_gmail_credential_id TEXT,
        n8n_contacts_credential_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `);

    // Create ai_chat_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_chat_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_question TEXT NOT NULL,
        ai_response TEXT,
        user_agent TEXT,
        user_ip TEXT,
        user_location JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create elevenlabs_config table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS elevenlabs_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        api_key TEXT NOT NULL,
        voice_id TEXT DEFAULT '9BWtsMINqrJLrRacOk9x',
        model TEXT DEFAULT 'eleven_multilingual_v2',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create workflow_status table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_status (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        message TEXT,
        progress INTEGER,
        data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_google_user_id ON users(google_user_id);
      CREATE INDEX IF NOT EXISTS idx_user_google_tokens_user_id ON user_google_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_google_tokens_google_user_id ON user_google_tokens(google_user_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_status_session_id ON workflow_status(session_id);
    `);

    // Insert default ElevenLabs config if not exists
    await pool.query(`
      INSERT INTO elevenlabs_config (api_key)
      VALUES ('sk_1dd8500bc9503a0f52d07ab4277c7c2c955000f5d4990c73')
      ON CONFLICT DO NOTHING
    `);

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
  }
}

// Cleanup old workflow status entries
export async function cleanupOldWorkflowStatus() {
  try {
    await pool.query(
      `DELETE FROM workflow_status
       WHERE created_at < NOW() - INTERVAL '24 hours'`
    );
    console.log("Cleaned up old workflow status entries");
  } catch (error) {
    console.error("Error cleaning up workflow status:", error);
  }
}
