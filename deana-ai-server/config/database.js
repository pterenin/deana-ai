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

    // Create user_google_tokens table (updated for dual accounts)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_google_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        google_user_id TEXT NOT NULL,
        account_type TEXT NOT NULL CHECK (account_type IN ('primary', 'secondary')),
        title TEXT NOT NULL,
        email TEXT NOT NULL,
        name TEXT,
        avatar_url TEXT,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_type TEXT NOT NULL,
        scope TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, account_type)
      )
    `);

    // Migrate existing single accounts to primary accounts (if needed)
    await pool.query(`
      DO $$
      BEGIN
        -- Check if account_type column exists
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user_google_tokens' AND column_name = 'account_type'
        ) THEN
          -- Add new columns
          ALTER TABLE user_google_tokens
          ADD COLUMN account_type TEXT DEFAULT 'primary',
          ADD COLUMN title TEXT DEFAULT 'Primary Account';

          -- Drop old unique constraint on user_id only
          ALTER TABLE user_google_tokens DROP CONSTRAINT IF EXISTS user_google_tokens_user_id_key;

          -- Add new unique constraint on user_id and account_type
          ALTER TABLE user_google_tokens ADD CONSTRAINT user_google_tokens_user_id_account_type_key UNIQUE(user_id, account_type);

          -- Update existing records to be primary accounts
          UPDATE user_google_tokens SET account_type = 'primary', title = 'Primary Account' WHERE account_type IS NULL;

          -- Make columns NOT NULL after setting defaults
          ALTER TABLE user_google_tokens ALTER COLUMN account_type SET NOT NULL;
          ALTER TABLE user_google_tokens ALTER COLUMN title SET NOT NULL;
        END IF;

        -- Add account-specific user info columns if they don't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user_google_tokens' AND column_name = 'email'
        ) THEN
          -- Add user info columns
          ALTER TABLE user_google_tokens
          ADD COLUMN email TEXT,
          ADD COLUMN name TEXT,
          ADD COLUMN avatar_url TEXT;

          -- Populate existing tokens with user info from users table
          UPDATE user_google_tokens
          SET email = u.email, name = u.name, avatar_url = u.avatar_url
          FROM users u
          WHERE user_google_tokens.user_id = u.id;

          -- Make email NOT NULL after populating
          ALTER TABLE user_google_tokens ALTER COLUMN email SET NOT NULL;
        END IF;
      END $$;
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
      CREATE INDEX IF NOT EXISTS idx_user_google_tokens_account_type ON user_google_tokens(user_id, account_type);
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
