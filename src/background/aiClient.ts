import type { AiSettings, ChatMessage } from "../shared/types";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
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

  const text = data.choices?.[0]?.message?.content?.trim() || "";
  if (!text) throw new Error("AI API returned an empty response.");
  return text;
}
