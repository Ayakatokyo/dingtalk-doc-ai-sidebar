import { describe, expect, it } from "vitest";
import { getAiSettings, saveAiSettings, validateAiSettings } from "../src/shared/storage";

describe("settings storage", () => {
  it("returns empty settings by default", async () => {
    await expect(getAiSettings()).resolves.toEqual({
      baseUrl: "",
      apiKey: "",
      model: ""
    });
  });

  it("saves and loads settings", async () => {
    await saveAiSettings({
      baseUrl: "https://api.example.com/v1",
      apiKey: "secret",
      model: "example-model"
    });

    await expect(getAiSettings()).resolves.toEqual({
      baseUrl: "https://api.example.com/v1",
      apiKey: "secret",
      model: "example-model"
    });
  });

  it("trims settings before saving", async () => {
    await saveAiSettings({
      baseUrl: " https://api.example.com/v1/ ",
      apiKey: " key ",
      model: " model "
    });

    await expect(getAiSettings()).resolves.toEqual({
      baseUrl: "https://api.example.com/v1",
      apiKey: "key",
      model: "model"
    });
  });

  it("returns empty settings when stored settings are null", async () => {
    await chrome.storage.local.set({ aiSettings: null });

    await expect(getAiSettings()).resolves.toEqual({
      baseUrl: "",
      apiKey: "",
      model: ""
    });
  });

  it("coerces partial malformed stored settings", async () => {
    await chrome.storage.local.set({
      aiSettings: { baseUrl: 42, apiKey: " key ", model: null }
    });

    await expect(getAiSettings()).resolves.toEqual({
      baseUrl: "",
      apiKey: "key",
      model: ""
    });
  });

  it("validates missing values", () => {
    expect(
      validateAiSettings({
        baseUrl: "",
        apiKey: "key",
        model: "model"
      })
    ).toBe("Base URL is required.");
  });

  it("validates invalid URL values", () => {
    expect(
      validateAiSettings({
        baseUrl: "not a url",
        apiKey: "key",
        model: "model"
      })
    ).toBe("Base URL must be a valid URL.");
  });

  it("validates unsupported URL schemes", () => {
    expect(
      validateAiSettings({
        baseUrl: "ftp://example.com/v1",
        apiKey: "key",
        model: "model"
      })
    ).toBe("Base URL must use HTTP or HTTPS.");
  });

  it("accepts localhost HTTP URLs", () => {
    expect(
      validateAiSettings({
        baseUrl: "http://localhost:11434/v1",
        apiKey: "key",
        model: "model"
      })
    ).toBeNull();
  });

  it("rejects non-loopback HTTP URLs", () => {
    expect(
      validateAiSettings({
        baseUrl: "http://api.example.com/v1",
        apiKey: "key",
        model: "model"
      })
    ).toBe("HTTP base URLs are only supported for local endpoints.");
  });

  it("accepts loopback HTTP URLs", () => {
    for (const baseUrl of [
      "http://localhost:11434/v1",
      "http://127.0.0.1:11434/v1",
      "http://[::1]:11434/v1"
    ]) {
      expect(
        validateAiSettings({
          baseUrl,
          apiKey: "key",
          model: "model"
        })
      ).toBeNull();
    }
  });
});
