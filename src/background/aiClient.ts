import type { AiSettings, ChatMessage } from "../shared/types";

interface ChatCompletionResponse {
  choices?: unknown;
  error?: {
    message?: string;
  };
}

interface ChatCompletionChoice {
  message?: {
    content?: unknown;
  };
}

function isChatCompletionChoice(choice: unknown): choice is ChatCompletionChoice {
  return Boolean(choice && typeof choice === "object" && "message" in choice);
}

function getResponseText(data: ChatCompletionResponse): string {
  if (!Array.isArray(data.choices)) {
    throw new Error("AI API returned an invalid response.");
  }

  const firstChoice = data.choices[0];
  if (!isChatCompletionChoice(firstChoice)) {
    throw new Error("AI API returned an invalid response.");
  }

  const content = firstChoice.message?.content;
  if (typeof content !== "string") {
    throw new Error("AI API returned an invalid response.");
  }

  return content.trim();
}

function chatCompletionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

export async function callOpenAiCompatibleApi(
  settings: AiSettings,
  messages: ChatMessage[]
): Promise<string> {
  const response = await fetch(chatCompletionsUrl(settings.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      temperature: 0.3
    })
  });

  const data = (await response.json().catch(() => ({}))) as ChatCompletionResponse;

  if (!response.ok) {
    throw new Error(`AI API request failed: ${data.error?.message || response.statusText}`);
  }

  const text = getResponseText(data);
  if (!text) throw new Error("AI API returned an empty response.");
  return text;
}
