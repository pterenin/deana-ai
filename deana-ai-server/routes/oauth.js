import express from "express";
import jwt from "jsonwebtoken";
import { pool } from "../config/database.js";
import { config } from "../config/environment.js";
import { generateToken } from "../middleware/auth.js";
import { authenticateToken } from "../middleware/auth.js";
import { invalidateUserCache } from "./chat.js";

const router = express.Router();

// Google OAuth endpoint
router.post("/google-oauth", async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Authorization code is required" });
    }

    // Debug: Log environment variables
    console.log("Environment variables check:");
    console.log(
      "GOOGLE_CLIENT_ID:",
      config.GOOGLE_CLIENT_ID ? "SET" : "NOT SET"
    );
    console.log(
      "GOOGLE_CLIENT_SECRET:",
      config.GOOGLE_CLIENT_SECRET ? "SET" : "NOT SET"
    );
    console.log("REDIRECT_URI:", config.REDIRECT_URI ? "SET" : "NOT SET");

    if (
      !config.GOOGLE_CLIENT_ID ||
      !config.GOOGLE_CLIENT_SECRET ||
      !config.REDIRECT_URI
    ) {
      return res
        .status(500)
        .json({ error: "Missing Google OAuth configuration" });
    }

    // Step 1: Exchange authorization code for tokens
    const tokenParams = {
      code,
      client_id: config.GOOGLE_CLIENT_ID,
      client_secret: config.GOOGLE_CLIENT_SECRET,
      redirect_uri: config.REDIRECT_URI,
      grant_type: "authorization_code",
    };

    // Debug: Log the parameters being sent to Google
    console.log("Token exchange parameters:", {
      ...tokenParams,
      client_secret: "***HIDDEN***", // Don't log the secret
    });

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(tokenParams),
    });

    console.log("Google token response status:", tokenResponse.status);
    console.log(
      "Google token response headers:",
      Object.fromEntries(tokenResponse.headers.entries())
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Google token exchange failed:");
      console.error("Status:", tokenResponse.status);
      console.error("Status Text:", tokenResponse.statusText);
      console.error("Response Body:", errorData);

      // Try to parse as JSON for better error details
      let parsedError;
      try {
        parsedError = JSON.parse(errorData);
        console.error("Parsed Error:", parsedError);
      } catch (e) {
        console.error("Could not parse error as JSON");
      }

      return res.status(400).json({
        error: "Failed to exchange authorization code for tokens",
        details: errorData,
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
      });
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, token_type, scope } =
      tokenData;

    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + expires_in);

    // Step 2: Get user info from Google
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!userInfoResponse.ok) {
      return res
        .status(400)
        .json({ error: "Failed to get user info from Google" });
    }

    const userInfo = await userInfoResponse.json();
    const { id: google_user_id, email, name, picture } = userInfo;

    // Step 3: Store user and tokens in database
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Insert or update user
      const userResult = await client.query(
        `INSERT INTO users (google_user_id, email, name, avatar_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (google_user_id)
         DO UPDATE SET
           email = EXCLUDED.email,
           name = EXCLUDED.name,
           avatar_url = EXCLUDED.avatar_url,
           updated_at = NOW()
         RETURNING id`,
        [google_user_id, email, name, picture]
      );

      const userId = userResult.rows[0].id;

      // Insert or update tokens
      await client.query(
        `INSERT INTO user_google_tokens
         (user_id, google_user_id, access_token, refresh_token, token_type, scope, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id)
         DO UPDATE SET
           access_token = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           token_type = EXCLUDED.token_type,
           scope = EXCLUDED.scope,
           expires_at = EXCLUDED.expires_at,
           updated_at = NOW()`,
        [
          userId,
          google_user_id,
          access_token,
          refresh_token,
          token_type,
          scope,
          expiryDate,
        ]
      );

      await client.query("COMMIT");

      // Invalidate cache for this user to ensure fresh data on next request
      invalidateUserCache(google_user_id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    // Generate JWT token
    const jwtToken = generateToken({
      userId: google_user_id,
      email,
      name,
      avatar_url: picture,
    });

    // Return success response
    res.json({
      success: true,
      message: "Google Calendar connected successfully",
      userId: google_user_id,
      email,
      name,
      avatar_url: picture,
      access_token,
      refresh_token,
      scope,
      token_type,
      expires_at: expiryDate.toISOString(),
      jwt_token: jwtToken,
    });
  } catch (error) {
    console.error("Error in google-oauth:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Disconnect Google account
router.post("/google-disconnect", async (req, res) => {
  const googleUserId = req.body.userId || (req.user && req.user.id);
  try {
    // Get the refresh token from DB using google_user_id
    const { rows } = await pool.query(
      "SELECT refresh_token FROM user_google_tokens WHERE google_user_id = $1",
      [googleUserId]
    );
    if (!rows.length) {
      return res.status(400).json({ error: "No Google account connected." });
    }
    const refreshToken = rows[0].refresh_token;
    // Revoke the token with Google
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `token=${encodeURIComponent(refreshToken)}`,
    });
    // Remove tokens from DB using google_user_id
    await pool.query(
      "DELETE FROM user_google_tokens WHERE google_user_id = $1",
      [googleUserId]
    );

    // Invalidate user cache
    invalidateUserCache(googleUserId);

    res.json({ success: true, message: "Google account disconnected." });
  } catch (error) {
    console.error("Error disconnecting Google account:", error);
    res.status(500).json({ error: "Failed to disconnect Google account." });
  }
});

// Diagnostic endpoint to test OAuth configuration
router.get("/oauth-diagnostic", async (req, res) => {
  try {
    console.log("=== OAuth Diagnostic ===");

    // Check environment variables
    const envCheck = {
      GOOGLE_CLIENT_ID: !!config.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!config.GOOGLE_CLIENT_SECRET,
      REDIRECT_URI: !!config.REDIRECT_URI,
      GOOGLE_CLIENT_ID_FORMAT: config.GOOGLE_CLIENT_ID?.includes(
        ".apps.googleusercontent.com"
      ),
    };

    console.log("Environment Check:", envCheck);

    // Test a simple OAuth discovery request
    try {
      const discoveryResponse = await fetch(
        "https://accounts.google.com/.well-known/openid_configuration"
      );
      const discoveryData = await discoveryResponse.json();
      console.log("Google OAuth Discovery:", discoveryData.token_endpoint);
    } catch (error) {
      console.error("OAuth Discovery failed:", error.message);
    }

    // Test if we can reach Google's token endpoint
    try {
      const testResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "invalid_test",
        }),
      });

      console.log("Token endpoint reachable:", testResponse.status);
      const testData = await testResponse.text();
      console.log("Test response:", testData);
    } catch (error) {
      console.error("Token endpoint test failed:", error.message);
    }

    res.json({
      message: "OAuth diagnostic completed",
      environmentCheck: envCheck,
      recommendations: [
        "Check Google Cloud Console OAuth client configuration",
        "Verify client is configured as 'Web application'",
        "Ensure OAuth consent screen is published or you're in test users",
        "Verify redirect URI matches exactly: " + config.REDIRECT_URI,
        "Check if required APIs are enabled (Google+ API, etc.)",
      ],
    });
  } catch (error) {
    console.error("Diagnostic error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
