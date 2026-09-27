import process from "node:process";

export type AiConfig = {
  apiKey: string;
  baseUrl: string;
  chatModel: string;
  transcribeModel: string;
};

export function getAiConfig(): AiConfig {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) throw new Error("Missing AI_API_KEY");

  return {
    apiKey,
    baseUrl:
      process.env.AI_BASE_URL ??
      "https://generativelanguage.googleapis.com/v1beta/openai",
    chatModel: process.env.AI_CHAT_MODEL ?? "gemini-2.5-flash",
    transcribeModel: process.env.AI_TRANSCRIBE_MODEL ?? "gemini-2.5-flash",
  };
}