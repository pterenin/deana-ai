import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config({ path: "./oauth.env" });

const N8N_REST_URL = process.env.N8N_REST_URL || "http://localhost:5678/api/v1";
const N8N_API_KEY = process.env.N8N_API_KEY;

function buildWorkflowUpdatePayload(workflow, updatedNodes) {
  // Only include allowed properties for PUT (active is read-only)
  return {
    name: workflow.name,
    nodes: updatedNodes,
    connections: workflow.connections,
    settings: workflow.settings,
  };
}

async function updateWorkflowCredentials(
  workflowId,
  credentialId,
  credentialName
) {
  try {
    // Get the current workflow
    const getRes = await fetch(`${N8N_REST_URL}/workflows/${workflowId}`, {
      headers: {
        "X-N8N-API-KEY": N8N_API_KEY,
      },
    });

    if (!getRes.ok) {
      console.error(
        `Failed to get workflow ${workflowId}:`,
        await getRes.text()
      );
      return false;
    }

    const workflow = await getRes.json();

    // Update nodes that use Google Calendar credentials
    const updatedNodes = workflow.nodes.map((node) => {
      if (
        node.type === "n8n-nodes-base.googleCalendarTool" ||
        node.type === "n8n-nodes-base.googleContacts"
      ) {
        // Update the credentials reference
        return {
          ...node,
          credentials: {
            googleCalendarOAuth2Api: {
              id: credentialId,
              name: credentialName,
            },
          },
        };
      }
      return node;
    });

    // Build the payload with only allowed properties
    const payload = buildWorkflowUpdatePayload(workflow, updatedNodes);

    // Debug: print the payload
    console.log(
      "Payload for workflow update:",
      JSON.stringify(payload, null, 2)
    );

    // Update the workflow with modified nodes
    const updateRes = await fetch(`${N8N_REST_URL}/workflows/${workflowId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": N8N_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!updateRes.ok) {
      console.error(
        `Failed to update workflow ${workflowId}:`,
        await updateRes.text()
      );
      return false;
    }

    console.log(`Successfully updated workflow ${workflowId}`);
    return true;
  } catch (error) {
    console.error(`Error updating workflow ${workflowId}:`, error);
    return false;
  }
}

// Test the function
async function test() {
  const credentialId = "zytHjxs545vlH4tX";
  const credentialName = "gcal-user-test-456";

  console.log("Updating Calendar Personal workflow...");
  await updateWorkflowCredentials(
    "H0q8QKEDMRszybNu",
    credentialId,
    credentialName
  );

  console.log("Updating Calendar Working workflow...");
  await updateWorkflowCredentials(
    "0PYWHgsfwADTsyPe",
    credentialId,
    credentialName
  );
}

test();
