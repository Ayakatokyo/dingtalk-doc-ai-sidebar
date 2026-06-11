import type { AiSettings } from "./types";

const STORAGE_KEY = "aiSettings";

const EMPTY_SETTINGS: AiSettings = {
  baseUrl: "",
  apiKey: "",
  model: ""
};

function coerceString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeSettings(settings: unknown): AiSettings {
  const record =
    settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {};

  return {
    baseUrl: coerceString(record.baseUrl).trim().replace(/\/+$/, ""),
    apiKey: coerceString(record.apiKey).trim(),
    model: coerceString(record.model).trim()
  };
}

export async function getAiSettings(): Promise<AiSettings> {
  const result = await chrome.storage.local.get({ [STORAGE_KEY]: EMPTY_SETTINGS });
  return normalizeSettings(result[STORAGE_KEY] as AiSettings);
}

export async function saveAiSettings(settings: AiSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: normalizeSettings(settings) });
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function validateAiSettings(settings: AiSettings): string | null {
  if (!settings.baseUrl.trim()) return "Base URL is required.";
  if (!settings.apiKey.trim()) return "API key is required.";
  if (!settings.model.trim()) return "Model is required.";
  let url: URL;
  try {
    url = new URL(settings.baseUrl);
  } catch {
    return "Base URL must be a valid URL.";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "Base URL must use HTTP or HTTPS.";
  }
  if (url.protocol === "http:" && !isLoopbackHostname(url.hostname)) {
    return "HTTP base URLs are only supported for local endpoints.";
  }
  return null;
}
