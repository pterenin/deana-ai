import type { Message } from "../store/chatStore";

// Placeholder function for sending messages to Deana backend
export const sendMessageToDeana = async (text: string): Promise<Message[]> => {
  console.log("Sending message to Deana:", text);

  // Simulate API delay
  await new Promise((resolve) =>
    setTimeout(resolve, 1000 + Math.random() * 2000)
  );

  // Mock response - replace with actual API call
  const responses = [
    "I understand you're asking about: " +
      text +
      ". Let me help you with that!",
    "That's an interesting question about: " +
      text +
      ". Here's what I think...",
    "Based on your message about: " +
      text +
      ", I'd recommend the following approach...",
    "Great question! Regarding: " +
      text +
      ", here are some key points to consider...",
  ];

  const randomResponse =
    responses[Math.floor(Math.random() * responses.length)];

  return [
    {
      id: Date.now().toString(),
      from: "bot",
      text: randomResponse,
      actions:
        Math.random() > 0.7
          ? [
              { id: "more-info", label: "Tell me more" },
              { id: "example", label: "Show example" },
              { id: "help", label: "Need help?" },
            ]
          : undefined,
      timestamp: new Date(),
    },
  ];
};

// Placeholder for handling action button clicks
export const handleActionClick = (actionId: string): void => {
  console.log("Action clicked:", actionId);

  // Add your action handling logic here
  // This could trigger n8n workflows, API calls, or other interactions

  switch (actionId) {
    case "more-info":
      console.log("User wants more information");
      break;
    case "example":
      console.log("User wants to see an example");
      break;
    case "help":
      console.log("User needs help");
      break;
    default:
      console.log("Unknown action:", actionId);
  }
};
