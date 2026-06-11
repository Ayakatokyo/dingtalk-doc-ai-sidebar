import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleRequest } from "../src/background";
import { callOpenAiCompatibleApi } from "../src/background/aiClient";
import { saveAiSettings } from "../src/shared/storage";

vi.mock("../src/background/aiClient", () => ({
  callOpenAiCompatibleApi: vi.fn()
}));

const validSettings = {
  baseUrl: "https://api.example.com/v1",
  apiKey: "secret",
  model: "example-model"
};

describe("background request handling", () => {
  beforeEach(() => {
    vi.mocked(callOpenAiCompatibleApi).mockReset();
  });

  it("returns settings validation failures", async () => {
    await expect(handleRequest({ type: "TEST_CONNECTION" })).resolves.toEqual({
      ok: false,
      error: "Base URL is required."
    });
  });

  it("tests the AI connection with valid settings", async () => {
    await saveAiSettings(validSettings);
    vi.mocked(callOpenAiCompatibleApi).mockResolvedValue("OK");

    await expect(handleRequest({ type: "TEST_CONNECTION" })).resolves.toEqual({
      ok: true,
      text: "OK"
    });

    expect(callOpenAiCompatibleApi).toHaveBeenCalledWith(validSettings, [
      { role: "system", content: "You are a connection test assistant." },
      { role: "user", content: "Reply with OK." }
    ]);
  });

  it("returns generate validation failures", async () => {
    await saveAiSettings(validSettings);

    await expect(
      handleRequest({
        type: "GENERATE",
        selectedText: " ",
        instruction: "Polish",
        quickActionId: null
      })
    ).resolves.toEqual({
      ok: false,
      error: "Selected text is required."
    });
  });

  it("returns AI client rejection messages", async () => {
    await saveAiSettings(validSettings);
    vi.mocked(callOpenAiCompatibleApi).mockRejectedValue(new Error("network down"));

    await expect(handleRequest({ type: "TEST_CONNECTION" })).resolves.toEqual({
      ok: false,
      error: "network down"
    });
  });
});
