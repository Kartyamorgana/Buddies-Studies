import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Provider AI mandiri — Google AI Studio (Gemini).
 * Endpoint OpenAI-compatible resmi:
 *   https://generativelanguage.googleapis.com/v1beta/openai/
 */
export function createAiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "google-ai-studio",
    baseURL:
      process.env.AI_BASE_URL ??
      "https://generativelanguage.googleapis.com/v1beta/openai",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}