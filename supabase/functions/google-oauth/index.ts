import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the request body
    const { code } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Authorization code is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get environment variables
    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const REDIRECT_URI = Deno.env.get("REDIRECT_URI");

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !REDIRECT_URI) {
      return new Response(
        JSON.stringify({ error: "Missing Google OAuth configuration" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 1: Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Google token exchange failed:", errorData);
      return new Response(
        JSON.stringify({
          error: "Failed to exchange authorization code for tokens",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
      return new Response(
        JSON.stringify({ error: "Failed to get user info from Google" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userInfo = await userInfoResponse.json();
    const { id: google_user_id, email, name, picture } = userInfo;

    // Step 3: Call n8n to inject credentials
    const n8nBaseUrl = Deno.env.get("N8N_BASE_URL");
    if (n8nBaseUrl) {
      try {
        const n8nResponse = await fetch(`${n8nBaseUrl}/send-credentials`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-N8N-API-KEY": Deno.env.get("N8N_API_KEY") || "",
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
    return new Response(
      JSON.stringify({
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
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in google-oauth:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
