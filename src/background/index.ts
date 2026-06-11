import { buildChatMessages } from "../shared/prompt";
import { getAiSettings, validateAiSettings } from "../shared/storage";
import type { RuntimeRequest, RuntimeResponse } from "../shared/types";
import { callOpenAiCompatibleApi } from "./aiClient";

let isRuntimeListenerRegistered = false;

export async function handleRequest(request: RuntimeRequest): Promise<RuntimeResponse> {
  try {
    const settings = await getAiSettings();
    const settingsError = validateAiSettings(settings);
    if (settingsError) return { ok: false, error: settingsError };

    if (request.type === "TEST_CONNECTION") {
      const text = await callOpenAiCompatibleApi(settings, [
        { role: "system", content: "You are a connection test assistant." },
        { role: "user", content: "Reply with OK." }
      ]);
      return { ok: true, text };
    }

    const messages = buildChatMessages(request);
    const text = await callOpenAiCompatibleApi(settings, messages);
    return { ok: true, text };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error."
    };
  }
}

export function registerRuntimeListener(): void {
  if (isRuntimeListenerRegistered) return;

  chrome.runtime.onMessage.addListener((request: RuntimeRequest, _sender, sendResponse) => {
    handleRequest(request).then(sendResponse);
    return true;
  });

  isRuntimeListenerRegistered = true;
}

registerRuntimeListener();
