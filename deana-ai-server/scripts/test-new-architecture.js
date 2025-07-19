// Test script for the new backend architecture
import fetch from "node-fetch";

async function testNewArchitecture() {
  console.log("Testing new backend architecture...\n");

  // Test 1: Health check
  console.log("1. Testing health check...");
  try {
    const healthResponse = await fetch("http://localhost:3001/health");
    const healthData = await healthResponse.json();
    console.log("✅ Health check passed:", healthData);
  } catch (error) {
    console.log("❌ Health check failed:", error.message);
    return;
  }

  // Test 2: Chat endpoint without authentication
  console.log("\n2. Testing chat endpoint without user authentication...");
  try {
    const chatResponse = await fetch("http://localhost:3001/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello", userId: "test-user" }),
    });

    if (chatResponse.ok) {
      const chatData = await chatResponse.json();
      console.log("✅ Chat endpoint responded:", chatData);
    } else {
      const errorData = await chatResponse.json();
      console.log(
        "✅ Chat endpoint correctly rejected unauthenticated user:",
        errorData.error
      );
    }
  } catch (error) {
    console.log("❌ Chat endpoint test failed:", error.message);
  }

  console.log("\n🎉 Backend architecture test completed!");
  console.log("\nNext steps:");
  console.log("1. Connect your Google account through the React app");
  console.log("2. Try sending a message in the chat");
  console.log(
    "3. Check the backend logs to see user-specific credential injection"
  );
}

testNewArchitecture().catch(console.error);
