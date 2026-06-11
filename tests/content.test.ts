import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SidebarElements } from "../src/content/sidebar";
import { createSidebar } from "../src/content/sidebar";
import type { RuntimeRequest } from "../src/shared/types";

vi.mock("../src/content/styles.css?inline", () => ({ default: "" }));

const storage = vi.hoisted(() => ({
  getAiSettings: vi.fn(async () => ({ baseUrl: "", apiKey: "", model: "" })),
  saveAiSettings: vi.fn(async () => undefined),
  validateAiSettings: vi.fn(() => null as string | null)
}));

vi.mock("../src/shared/storage", () => storage);

async function importContentModule(): Promise<typeof import("../src/content/index")> {
  return import("../src/content/index");
}

function fillValidSettings(sidebar: SidebarElements): void {
  sidebar.baseUrl.value = "https://api.example.com/v1";
  sidebar.apiKey.value = "secret";
  sidebar.model.value = "model";
}

describe("content runtime messaging", () => {
  beforeEach(() => {
    vi.resetModules();
    document.documentElement.innerHTML = "<head></head><body></body>";
    storage.getAiSettings.mockResolvedValue({ baseUrl: "", apiKey: "", model: "" });
    storage.saveAiSettings.mockResolvedValue(undefined);
    storage.validateAiSettings.mockReturnValue(null);
    vi.mocked(chrome.runtime.sendMessage).mockReset();
    Object.defineProperty(chrome.runtime, "lastError", {
      configurable: true,
      value: undefined
    });
  });

  it("returns runtime lastError message when sendMessage callback sees it", async () => {
    const { sendRuntimeMessage } = await importContentModule();
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      ((...args: unknown[]) => {
        const callback = args.find((arg): arg is (response?: unknown) => void => typeof arg === "function");
        Object.defineProperty(chrome.runtime, "lastError", {
          configurable: true,
          value: { message: "Background worker unavailable." }
        });
        callback?.(undefined);
      }) as typeof chrome.runtime.sendMessage
    );

    await expect(sendRuntimeMessage({ type: "TEST_CONNECTION" })).resolves.toEqual({
      ok: false,
      error: "Background worker unavailable."
    });
  });

  it("returns a typed failure when sendMessage throws synchronously", async () => {
    const { sendRuntimeMessage } = await importContentModule();
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(() => {
      throw new Error("Extension context invalidated.");
    });

    await expect(sendRuntimeMessage({ type: "TEST_CONNECTION" })).resolves.toEqual({
      ok: false,
      error: "Extension context invalidated."
    });
  });

  it("surfaces settings save rejection as status", async () => {
    const { handleSaveSettings } = await importContentModule();
    const sidebar = createSidebar();
    fillValidSettings(sidebar);
    storage.saveAiSettings.mockRejectedValue(new Error("Storage quota exceeded."));

    await handleSaveSettings(sidebar);

    expect(sidebar.status.textContent).toBe("Storage quota exceeded.");
    expect(sidebar.status.dataset.kind).toBe("error");
  });

  it("surfaces test connection save rejection and clears loading state", async () => {
    const { handleTestConnection } = await importContentModule();
    const sidebar = createSidebar();
    fillValidSettings(sidebar);
    storage.saveAiSettings.mockRejectedValue(new Error("Storage unavailable."));

    await handleTestConnection(sidebar);

    expect(sidebar.status.textContent).toBe("Storage unavailable.");
    expect(sidebar.status.dataset.kind).toBe("error");
    expect(sidebar.generateButton.disabled).toBe(false);
    expect(sidebar.testConnectionButton.disabled).toBe(false);
    expect(sidebar.testConnectionButton.textContent).toBe("Test");
  });
});
