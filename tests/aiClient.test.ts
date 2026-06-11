import { beforeEach, describe, expect, it, vi } from "vitest";
import { callOpenAiCompatibleApi } from "../src/background/aiClient";
import type { AiSettings, ChatMessage } from "../src/shared/types";

const settings: AiSettings = {
  baseUrl: "https://api.example.com/v1",
  apiKey: "secret",
  model: "example-model"
};

const messages: ChatMessage[] = [
  { role: "system", content: "System" },
  { role: "user", content: "User" }
];

describe("AI client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("sends an OpenAI-compatible chat completions request", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "Generated text" } }]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await expect(callOpenAiCompatibleApi(settings, messages)).resolves.toBe("Generated text");

    expect(fetch).toHaveBeenCalledWith("https://api.example.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer secret",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "example-model",
        messages,
        temperature: 0.3
      })
    });
  });

  it("throws readable API errors", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Invalid key" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    );

    await expect(callOpenAiCompatibleApi(settings, messages)).rejects.toThrow(
      "AI API request failed: Invalid key"
    );
  });

  it("throws when response content is empty", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "" } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    await expect(callOpenAiCompatibleApi(settings, messages)).rejects.toThrow(
      "AI API returned an empty response."
    );
  });

  it("throws when response choices are missing", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    await expect(callOpenAiCompatibleApi(settings, messages)).rejects.toThrow(
      "AI API returned an invalid response."
    );
  });

  it("throws when response choices are not an array", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ choices: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    await expect(callOpenAiCompatibleApi(settings, messages)).rejects.toThrow(
      "AI API returned an invalid response."
    );
  });

  it("throws when response content is not a string", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 42 } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    await expect(callOpenAiCompatibleApi(settings, messages)).rejects.toThrow(
      "AI API returned an invalid response."
    );
  });
});
