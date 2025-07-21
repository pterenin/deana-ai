import express from "express";
import jwt from "jsonwebtoken";
import { pool } from "../config/database.js";
import { config } from "../config/environment.js";
import { generateToken } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";

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
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: config.GOOGLE_CLIENT_ID,
        client_secret: config.GOOGLE_CLIENT_SECRET,
        redirect_uri: config.REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Google token exchange failed:", errorData);
      return res.status(400).json({
        error: "Failed to exchange authorization code for tokens",
        details: errorData,
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
router.post("/google-disconnect", requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    // Get the refresh token from DB
    const { rows } = await pool.query(
      "SELECT refresh_token FROM user_google_tokens WHERE user_id = $1",
      [userId]
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
    // Remove tokens from DB
    await pool.query("DELETE FROM user_google_tokens WHERE user_id = $1", [
      userId,
    ]);
    res.json({ success: true, message: "Google account disconnected." });
  } catch (error) {
    console.error("Error disconnecting Google account:", error);
    res.status(500).json({ error: "Failed to disconnect Google account." });
  }
});

export default router;
