#!/usr/bin/env node

/**
 * Migration script to transfer data from Supabase to Express server
 *
 * Usage:
 * 1. Set up your Express server with PostgreSQL
 * 2. Configure environment variables
 * 3. Run: node migrate-from-supabase.js
 */

import dotenv from "dotenv";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: "./oauth.env" });

// Configuration
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://pqwrhinsjifmaaziyhqj.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxd3JoaW5zamlmbWFheml5aHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MDkxMzYsImV4cCI6MjA2NDQ4NTEzNn0.58ZzeBUIuWl2DVGpPj1B7EqWpI_GbGyzplNoMCL66ik";

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const postgresPool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL || "postgresql://localhost:5432/deana_ai",
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function migrateData() {
  console.log("🚀 Starting migration from Supabase to Express server...\n");

  try {
    // 1. Migrate users
    console.log("📊 Migrating users...");
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("*");

    if (usersError) {
      console.error("❌ Error fetching users from Supabase:", usersError);
      return;
    }

    if (users && users.length > 0) {
      for (const user of users) {
        await postgresPool.query(
          `INSERT INTO users (id, google_user_id, email, name, avatar_url, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (google_user_id) DO UPDATE SET
             email = EXCLUDED.email,
             name = EXCLUDED.name,
             avatar_url = EXCLUDED.avatar_url,
             updated_at = NOW()`,
          [
            user.id,
            user.google_user_id,
            user.email,
            user.name,
            user.avatar_url,
            user.created_at,
            user.updated_at,
          ]
        );
      }
      console.log(`✅ Migrated ${users.length} users`);
    } else {
      console.log("ℹ️  No users to migrate");
    }

    // 2. Migrate user tokens
    console.log("\n🔐 Migrating user tokens...");
    const { data: tokens, error: tokensError } = await supabase
      .from("user_google_tokens")
      .select("*");

    if (tokensError) {
      console.error("❌ Error fetching tokens from Supabase:", tokensError);
      return;
    }

    if (tokens && tokens.length > 0) {
      for (const token of tokens) {
        await postgresPool.query(
          `INSERT INTO user_google_tokens (id, user_id, google_user_id, access_token, refresh_token, token_type, scope, expires_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (user_id) DO UPDATE SET
             access_token = EXCLUDED.access_token,
             refresh_token = EXCLUDED.refresh_token,
             token_type = EXCLUDED.token_type,
             scope = EXCLUDED.scope,
             expires_at = EXCLUDED.expires_at,
             updated_at = NOW()`,
          [
            token.id,
            token.user_id,
            token.google_user_id,
            token.access_token,
            token.refresh_token,
            token.token_type,
            token.scope,
            token.expires_at,
            token.created_at,
            token.updated_at,
          ]
        );
      }
      console.log(`✅ Migrated ${tokens.length} user tokens`);
    } else {
      console.log("ℹ️  No user tokens to migrate");
    }

    // 3. Migrate chat logs
    console.log("\n💬 Migrating chat logs...");
    const { data: chatLogs, error: chatLogsError } = await supabase
      .from("ai_chat_logs")
      .select("*");

    if (chatLogsError) {
      console.error(
        "❌ Error fetching chat logs from Supabase:",
        chatLogsError
      );
      return;
    }

    if (chatLogs && chatLogs.length > 0) {
      for (const log of chatLogs) {
        await postgresPool.query(
          `INSERT INTO ai_chat_logs (id, user_question, ai_response, user_agent, user_ip, user_location, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [
            log.id,
            log.user_question,
            log.ai_response,
            log.user_agent,
            log.user_ip,
            log.user_location,
            log.created_at,
          ]
        );
      }
      console.log(`✅ Migrated ${chatLogs.length} chat logs`);
    } else {
      console.log("ℹ️  No chat logs to migrate");
    }

    // 4. Migrate ElevenLabs config
    console.log("\n🎵 Migrating ElevenLabs configuration...");
    const { data: elevenLabsConfig, error: configError } = await supabase
      .from("elevenlabs_config")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    if (configError) {
      console.error(
        "❌ Error fetching ElevenLabs config from Supabase:",
        configError
      );
      return;
    }

    if (elevenLabsConfig && elevenLabsConfig.length > 0) {
      const config = elevenLabsConfig[0];
      await postgresPool.query(
        `INSERT INTO elevenlabs_config (api_key, voice_id, model, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [
          config.api_key,
          config.voice_id,
          config.model,
          config.created_at,
          config.updated_at,
        ]
      );
      console.log("✅ Migrated ElevenLabs configuration");
    } else {
      console.log("ℹ️  No ElevenLabs configuration to migrate");
    }

    // 5. Migrate workflow status
    console.log("\n⚙️  Migrating workflow status...");
    const { data: workflowStatus, error: workflowError } = await supabase
      .from("workflow_status")
      .select("*");

    if (workflowError) {
      console.error(
        "❌ Error fetching workflow status from Supabase:",
        workflowError
      );
      return;
    }

    if (workflowStatus && workflowStatus.length > 0) {
      for (const status of workflowStatus) {
        await postgresPool.query(
          `INSERT INTO workflow_status (id, session_id, type, message, progress, data, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [
            status.id,
            status.session_id,
            status.type,
            status.message,
            status.progress,
            status.data,
            status.created_at,
          ]
        );
      }
      console.log(
        `✅ Migrated ${workflowStatus.length} workflow status entries`
      );
    } else {
      console.log("ℹ️  No workflow status to migrate");
    }

    console.log("\n🎉 Migration completed successfully!");
    console.log("\n📋 Next steps:");
    console.log("1. Update your frontend to use the Express server endpoints");
    console.log("2. Remove Supabase dependencies from your project");
    console.log(
      "3. Update environment variables to point to your Express server"
    );
    console.log("4. Test the application to ensure everything works correctly");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await postgresPool.end();
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateData();
}

export { migrateData };
