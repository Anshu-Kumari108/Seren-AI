import { Inngest } from "inngest";

// Initialize the Inngest client
export const inngest = new Inngest({
  id: "ai-therapy-agent",
  eventKey: process.env.INNGEST_EVENT_KEY, // 🔐 Loaded from environment variable
});

// Export the functions array (this will be populated by the functions.ts file)
export const functions: any[] = [];
