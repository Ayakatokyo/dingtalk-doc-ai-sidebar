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

  it("validates missing values", () => {
    expect(
      validateAiSettings({
        baseUrl: "",
        apiKey: "key",
        model: "model"
      })
    ).toBe("Base URL is required.");
  });
});
