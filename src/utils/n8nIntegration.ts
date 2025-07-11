/**
 * n8n Integration Utilities
 * Handles credential injection and workflow triggering
 */

interface N8nCredentialData {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  scope: string;
  tokenType: string;
  expiryDate: string;
}

interface N8nWorkflowPayload {
  userId: string;
  action: string;
  timestamp: string;
  [key: string]: any;
}

/**
 * Inject Google Calendar OAuth2 credentials into n8n
 */
export async function injectN8nCredentials(
  credentialData: N8nCredentialData,
  userId: string
): Promise<boolean> {
  try {
    const n8nBaseUrl = import.meta.env.VITE_N8N_BASE_URL;
    const n8nApiKey = import.meta.env.VITE_N8N_API_KEY;

    if (!n8nBaseUrl) {
      console.warn("N8N_BASE_URL not configured");
      return false;
    }

    const response = await fetch(`${n8nBaseUrl}/send-credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": n8nApiKey || "",
      },
      body: JSON.stringify({
        credentialType: "googleCalendarOAuth2Api",
        credentialData,
        userId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to inject n8n credentials:", errorText);
      return false;
    }

    console.log("Successfully injected n8n credentials");
    return true;
  } catch (error) {
    console.error("Error injecting n8n credentials:", error);
    return false;
  }
}

/**
 * Trigger n8n workflow
 */
export async function triggerN8nWorkflow(
  workflowId: string,
  payload: N8nWorkflowPayload
): Promise<boolean> {
  try {
    const n8nBaseUrl = import.meta.env.VITE_N8N_BASE_URL;

    if (!n8nBaseUrl) {
      console.warn("N8N_BASE_URL not configured");
      return false;
    }

    const response = await fetch(`${n8nBaseUrl}/webhook/${workflowId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to trigger n8n workflow:", errorText);
      return false;
    }

    console.log("Successfully triggered n8n workflow");
    return true;
  } catch (error) {
    console.error("Error triggering n8n workflow:", error);
    return false;
  }
}

/**
 * Get Google tokens from Supabase for n8n integration
 */
export async function getGoogleTokensFromSupabase(
  userId: string
): Promise<N8nCredentialData | null> {
  try {
    const { supabase } = await import("../integrations/supabase/client");

    const { data, error } = await supabase
      .from("user_google_tokens")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      console.error("Failed to get Google tokens from Supabase:", error);
      return null;
    }

    // Check if token is expired
    const expiresAt = new Date(data.expires_at);
    const now = new Date();

    if (expiresAt <= now) {
      console.log("Token expired, attempting refresh...");
      // TODO: Implement token refresh logic
      return null;
    }

    return {
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      scope: data.scope,
      tokenType: data.token_type,
      expiryDate: data.expires_at,
    };
  } catch (error) {
    console.error("Error getting Google tokens from Supabase:", error);
    return null;
  }
}

/**
 * Complete n8n integration flow
 */
export async function completeN8nIntegration(userId: string): Promise<boolean> {
  try {
    // Get tokens from Supabase
    const credentialData = await getGoogleTokensFromSupabase(userId);

    if (!credentialData) {
      console.error("No valid Google tokens found for user");
      return false;
    }

    // Inject credentials into n8n
    const credentialsInjected = await injectN8nCredentials(
      credentialData,
      userId
    );

    if (!credentialsInjected) {
      console.error("Failed to inject credentials into n8n");
      return false;
    }

    // Trigger workflow
    const workflowTriggered = await triggerN8nWorkflow("my-workflow", {
      userId,
      action: "google_calendar_connected",
      timestamp: new Date().toISOString(),
    });

    if (!workflowTriggered) {
      console.error("Failed to trigger n8n workflow");
      return false;
    }

    console.log("n8n integration completed successfully");
    return true;
  } catch (error) {
    console.error("Error in n8n integration:", error);
    return false;
  }
}
