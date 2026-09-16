import OpenAI from "openai";

export function getAIClient() {
  const baseURL = process.env.AI_BASE_URL || "https://api.openai.com/v1";
  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || "";
  
  if (!apiKey) {
    throw new Error("Missing AI API Key. Please configure it in the settings or environment.");
  }

  // Support for OpenRouter or other OpenAI compatible APIs.
  return new OpenAI({
    baseURL: baseURL,
    apiKey: apiKey,
    // Note: Some providers might not fully support this option in the way OpenAI does, 
    // but it's safe to include.
    dangerouslyAllowBrowser: false, 
  });
}

export function getAIModel() {
  return process.env.AI_MODEL || "gpt-4o-mini"; 
}
