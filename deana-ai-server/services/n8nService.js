import { config, urls } from "../config/environment.js";

// Helper to create or update n8n credentials for a user/service
export async function createOrUpdateN8nCredential(
  userId,
  serviceType,
  serviceTokenData
) {
  try {
    // Create credential with proper data structure
    const res = await fetch(`${urls.N8N_REST_URL}/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": config.N8N_API_KEY,
      },
      body: JSON.stringify({
        name: `${serviceType}-user-${userId}`,
        type: serviceType,
        data: {
          clientId: serviceTokenData.clientId,
          clientSecret: serviceTokenData.clientSecret,
          accessToken: serviceTokenData.accessToken,
          refreshToken: serviceTokenData.refreshToken,
          scope: serviceTokenData.scope,
          tokenType: serviceTokenData.tokenType,
          expiry_date: serviceTokenData.expiry_date,
        },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(
        `Failed to create n8n credential for ${serviceType}:`,
        errorText
      );
      throw new Error(errorText);
    }

    const { id } = await res.json();
    console.log(
      `Created n8n credential for user ${userId} (${serviceType}): ${id}`
    );
    return id;
  } catch (error) {
    console.error(`Error creating credential for ${serviceType}:`, error);
    throw error;
  }
}

// Function to update workflow with multiple credentials
export async function updateWorkflowWithCredentials(credentials, userId) {
  try {
    if (!config.N8N_API_KEY) {
      console.warn("N8N_API_KEY not configured");
      return false;
    }

    // Update the workflow to use all the credentials
    const workflowUpdateRes = await fetch(
      `${urls.N8N_REST_URL}/workflows/${config.N8N_WORKFLOW_ID}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-N8N-API-KEY": config.N8N_API_KEY,
        },
        body: JSON.stringify({
          credentials: credentials,
        }),
      }
    );

    if (!workflowUpdateRes.ok) {
      const errorText = await workflowUpdateRes.text();
      console.error("Failed to update workflow with credentials:", errorText);
      return false;
    }

    console.log(`Updated workflow with credentials for user ${userId}`);
    return true;
  } catch (error) {
    console.error("Error updating workflow:", error);
    return false;
  }
}
