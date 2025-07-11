require("dotenv").config({ path: "./oauth.env" });
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Google OAuth endpoint
app.post("/google-oauth", async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Authorization code is required" });
    }

    // Get environment variables
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const REDIRECT_URI = process.env.REDIRECT_URI;
    const N8N_BASE_URL = process.env.N8N_BASE_URL;
    const N8N_API_KEY = process.env.N8N_API_KEY;

    console.log("Environment variables:");
    console.log("GOOGLE_CLIENT_ID:", GOOGLE_CLIENT_ID ? "SET" : "NOT SET");
    console.log(
      "GOOGLE_CLIENT_SECRET:",
      GOOGLE_CLIENT_SECRET ? "SET" : "NOT SET"
    );
    console.log("REDIRECT_URI:", REDIRECT_URI);
    console.log("Code received:", code);

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !REDIRECT_URI) {
      return res
        .status(500)
        .json({ error: "Missing Google OAuth configuration" });
    }

    // Build the request body for debugging
    const requestBody = new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    });

    console.log("Request body being sent to Google:");
    console.log("redirect_uri:", REDIRECT_URI);
    console.log("client_id:", GOOGLE_CLIENT_ID);
    console.log("grant_type: authorization_code");
    console.log("Full request body:", requestBody.toString());

    // Step 1: Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: requestBody,
    });

    console.log("Google token response status:", tokenResponse.status);
    console.log(
      "Google token response headers:",
      Object.fromEntries(tokenResponse.headers.entries())
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Google token exchange failed - Full error response:");
      console.error("Status:", tokenResponse.status);
      console.error("Status Text:", tokenResponse.statusText);
      console.error(
        "Headers:",
        Object.fromEntries(tokenResponse.headers.entries())
      );
      console.error("Body:", errorData);

      // Try to parse the error as JSON for better formatting
      try {
        const errorJson = JSON.parse(errorData);
        console.error("Parsed error JSON:", JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.error("Could not parse error as JSON:", e.message);
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

    // Step 3: Call n8n to inject credentials
    if (N8N_BASE_URL) {
      try {
        const n8nResponse = await fetch(`${N8N_BASE_URL}/send-credentials`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-N8N-API-KEY": N8N_API_KEY || "",
          },
          body: JSON.stringify({
            credentialType: "googleCalendarOAuth2Api",
            credentialData: {
              clientId: GOOGLE_CLIENT_ID,
              clientSecret: GOOGLE_CLIENT_SECRET,
              accessToken: access_token,
              refreshToken: refresh_token,
              scope,
              tokenType: token_type,
              expiryDate: expiryDate.toISOString(),
            },
            userId: google_user_id,
          }),
        });

        if (!n8nResponse.ok) {
          console.warn(
            "Failed to inject n8n credentials:",
            await n8nResponse.text()
          );
        } else {
          console.log("Successfully injected n8n credentials");
        }
      } catch (error) {
        console.warn("Error injecting n8n credentials:", error);
      }
    }

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
    });
  } catch (error) {
    console.error("Error in google-oauth:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.listen(PORT, () => {
  console.log(`OAuth server running on http://localhost:${PORT}`);
});
