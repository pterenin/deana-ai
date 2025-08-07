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
    const { code, accountType = "primary", title, currentUserId } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Authorization code is required" });
    }

    if (!accountType || !["primary", "secondary"].includes(accountType)) {
      return res
        .status(400)
        .json({ error: "Valid account type (primary/secondary) is required" });
    }

    if (!title || title.trim() === "") {
      return res.status(400).json({ error: "Account title is required" });
    }

    // For secondary accounts, we need a current user ID to link to
    if (accountType === "secondary" && !currentUserId) {
      return res.status(400).json({
        error: "Current user ID is required for secondary account connection",
      });
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
    let primaryUserGoogleId = google_user_id; // This will be used for JWT generation
    let userId;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (accountType === "primary") {
        // For primary account, insert or update user
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
        userId = userResult.rows[0].id;
      } else {
        // For secondary account, find the existing user by currentUserId
        const existingUserResult = await client.query(
          `SELECT u.id, u.google_user_id FROM users u WHERE u.google_user_id = $1`,
          [currentUserId]
        );

        if (existingUserResult.rows.length === 0) {
          throw new Error(
            "Primary user not found. Please ensure you're logged in with your primary account."
          );
        }

        userId = existingUserResult.rows[0].id;
        primaryUserGoogleId = existingUserResult.rows[0].google_user_id; // Use primary account's ID for JWT
      }

      // Insert or update tokens
      await client.query(
        `INSERT INTO user_google_tokens
         (user_id, google_user_id, account_type, title, email, name, avatar_url, access_token, refresh_token, token_type, scope, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (user_id, account_type)
         DO UPDATE SET
           google_user_id = EXCLUDED.google_user_id,
           title = EXCLUDED.title,
           email = EXCLUDED.email,
           name = EXCLUDED.name,
           avatar_url = EXCLUDED.avatar_url,
           access_token = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           token_type = EXCLUDED.token_type,
           scope = EXCLUDED.scope,
           expires_at = EXCLUDED.expires_at,
           updated_at = NOW()`,
        [
          userId,
          google_user_id,
          accountType,
          title.trim(),
          email,
          name,
          picture,
          access_token,
          refresh_token,
          token_type,
          scope,
          expiryDate,
        ]
      );

      await client.query("COMMIT");

      // Invalidate cache for this user to ensure fresh data on next request
      invalidateUserCache(primaryUserGoogleId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    // Generate JWT token using primary user's ID
    const jwtToken = generateToken({
      userId: primaryUserGoogleId,
      email,
      name,
      avatar_url: picture,
    });

    // Return success response
    res.json({
      success: true,
      message: `Google ${accountType} account connected successfully`,
      userId: primaryUserGoogleId,
      email,
      name,
      avatar_url: picture,
      accountType,
      title: title.trim(),
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
  const { userId: googleUserId, accountType = "primary" } = req.body;

  if (!googleUserId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  if (!["primary", "secondary"].includes(accountType)) {
    return res
      .status(400)
      .json({ error: "Valid account type (primary/secondary) is required" });
  }

  try {
    // Get the refresh token from DB using google_user_id and account_type
    const { rows } = await pool.query(
      "SELECT refresh_token, title FROM user_google_tokens ugt JOIN users u ON ugt.user_id = u.id WHERE u.google_user_id = $1 AND ugt.account_type = $2",
      [googleUserId, accountType]
    );

    if (!rows.length) {
      return res
        .status(400)
        .json({ error: `No ${accountType} Google account connected.` });
    }

    const { refresh_token: refreshToken, title } = rows[0];

    // Revoke the token with Google
    if (refreshToken) {
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `token=${encodeURIComponent(refreshToken)}`,
      });
    }

    // Remove tokens from DB using google_user_id and account_type
    await pool.query(
      "DELETE FROM user_google_tokens WHERE user_id = (SELECT id FROM users WHERE google_user_id = $1) AND account_type = $2",
      [googleUserId, accountType]
    );

    // Invalidate user cache
    invalidateUserCache(googleUserId);

    res.json({
      success: true,
      message: `${title} (${accountType}) account disconnected successfully.`,
      accountType,
    });
  } catch (error) {
    console.error("Error disconnecting Google account:", error);
    res.status(500).json({ error: "Failed to disconnect Google account." });
  }
});

// Get user's connected accounts
router.get("/user-accounts/:googleUserId", async (req, res) => {
  try {
    const { googleUserId } = req.params;

    if (!googleUserId) {
      return res.status(400).json({ error: "Google User ID is required" });
    }

    // Get both primary and secondary accounts for the user
    const { rows } = await pool.query(
      `SELECT
        ugt.account_type,
        ugt.google_user_id,
        ugt.title,
        ugt.email,
        ugt.name,
        ugt.avatar_url,
        ugt.scope,
        ugt.expires_at
      FROM user_google_tokens ugt
      JOIN users u ON ugt.user_id = u.id
      WHERE u.google_user_id = $1
      ORDER BY ugt.account_type`,
      [googleUserId]
    );

    const accounts = {
      primary: null,
      secondary: null,
    };

    rows.forEach((row) => {
      accounts[row.account_type] = {
        google_user_id: row.google_user_id,
        email: row.email,
        name: row.name,
        avatar_url: row.avatar_url,
        title: row.title,
        scope: row.scope,
        expires_at: row.expires_at,
        connected: true,
      };
    });

    res.json({
      success: true,
      accounts,
    });
  } catch (error) {
    console.error("Error fetching user accounts:", error);
    res.status(500).json({ error: "Failed to fetch user accounts" });
  }
});

// Update account title
router.post("/update-account-title", async (req, res) => {
  try {
    const { googleUserId, accountType, title } = req.body;

    if (!googleUserId || !accountType || !title) {
      return res.status(400).json({
        error: "Google User ID, account type, and title are required",
      });
    }

    if (!["primary", "secondary"].includes(accountType)) {
      return res
        .status(400)
        .json({ error: "Valid account type (primary/secondary) is required" });
    }

    // Update the title in the database
    const result = await pool.query(
      `UPDATE user_google_tokens
       SET title = $1, updated_at = NOW()
       WHERE user_id = (SELECT id FROM users WHERE google_user_id = $2)
       AND account_type = $3`,
      [title.trim(), googleUserId, accountType]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: `No ${accountType} account found to update` });
    }

    // Invalidate user cache
    invalidateUserCache(googleUserId);

    res.json({
      success: true,
      message: `${accountType} account title updated to "${title.trim()}"`,
      accountType,
      title: title.trim(),
    });
  } catch (error) {
    console.error("Error updating account title:", error);
    res.status(500).json({ error: "Failed to update account title" });
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
