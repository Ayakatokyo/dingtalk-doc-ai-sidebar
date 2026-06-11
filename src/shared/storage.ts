import type { AiSettings } from "./types";

const STORAGE_KEY = "aiSettings";

const EMPTY_SETTINGS: AiSettings = {
  baseUrl: "",
  apiKey: "",
  model: ""
};

function normalizeSettings(settings: AiSettings): AiSettings {
  return {
    baseUrl: settings.baseUrl.trim().replace(/\/+$/, ""),
    apiKey: settings.apiKey.trim(),
    model: settings.model.trim()
  };
}

export async function getAiSettings(): Promise<AiSettings> {
  const result = await chrome.storage.local.get({ [STORAGE_KEY]: EMPTY_SETTINGS });
  return normalizeSettings(result[STORAGE_KEY] as AiSettings);
}

export async function saveAiSettings(settings: AiSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: normalizeSettings(settings) });
}

export function validateAiSettings(settings: AiSettings): string | null {
  if (!settings.baseUrl.trim()) return "Base URL is required.";
  if (!settings.apiKey.trim()) return "API key is required.";
  if (!settings.model.trim()) return "Model is required.";
  try {
    new URL(settings.baseUrl);
  } catch {
    return "Base URL must be a valid URL.";
  }
  return null;
}
