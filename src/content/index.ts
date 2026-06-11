import styles from "./styles.css?inline";
import { QUICK_ACTIONS } from "../shared/prompt";
import { getAiSettings, saveAiSettings, validateAiSettings } from "../shared/storage";
import type { AiSettings, RuntimeRequest, RuntimeResponse } from "../shared/types";
import { readSelectedText } from "./selection";
import {
  applyRuntimeResponse,
  createSidebar,
  quickActionIdFromButton,
  setLoading,
  setSidebarOpen,
  setStatus
} from "./sidebar";

async function sendRuntimeMessage(request: RuntimeRequest): Promise<RuntimeResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(request, (response: RuntimeResponse | undefined) => {
      resolve(response || { ok: false, error: "No response from extension background worker." });
    });
  });
}

function injectStyles(): void {
  if (document.getElementById("dingtalk-ai-sidebar-styles")) return;

  const style = document.createElement("style");
  style.id = "dingtalk-ai-sidebar-styles";
  style.textContent = styles;
  document.documentElement.append(style);
}

function readSettingsFromInputs(sidebar: ReturnType<typeof createSidebar>): AiSettings {
  return {
    baseUrl: sidebar.baseUrl.value,
    apiKey: sidebar.apiKey.value,
    model: sidebar.model.value
  };
}

function refreshSelectedText(sidebar: ReturnType<typeof createSidebar>): string {
  const selectedText = readSelectedText();
  if (selectedText) sidebar.selectedText.value = selectedText;
  return sidebar.selectedText.value;
}

async function saveValidatedSettings(sidebar: ReturnType<typeof createSidebar>): Promise<boolean> {
  const settings = readSettingsFromInputs(sidebar);
  const error = validateAiSettings(settings);
  if (error) {
    setStatus(sidebar, error, "error");
    return false;
  }

  await saveAiSettings(settings);
  return true;
}

async function main(): Promise<void> {
  if (document.getElementById("dingtalk-ai-sidebar-root")) return;

  injectStyles();
  const sidebar = createSidebar();
  const settings = await getAiSettings();
  sidebar.baseUrl.value = settings.baseUrl;
  sidebar.apiKey.value = settings.apiKey;
  sidebar.model.value = settings.model;

  sidebar.toggleButton.addEventListener("click", () => {
    const isOpen = sidebar.panel.dataset.open === "true";
    if (!isOpen) return;

    const selectedText = refreshSelectedText(sidebar);
    if (!selectedText.trim()) {
      setStatus(sidebar, "Select text in the document first.", "error");
    } else {
      setStatus(sidebar, "Selected text refreshed.");
    }
  });

  sidebar.root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.classList.contains("dai-action")) return;

    const actionId = quickActionIdFromButton(target);
    const action = QUICK_ACTIONS.find((item) => item.id === actionId);
    if (action) {
      sidebar.instruction.value = action.instruction;
      setStatus(sidebar, `${action.label} instruction ready.`);
    }
  });

  sidebar.generateButton.addEventListener("click", async () => {
    const selectedText = refreshSelectedText(sidebar);
    if (!selectedText.trim()) {
      setStatus(sidebar, "Select text in the document first.", "error");
      return;
    }

    setLoading(sidebar, true);
    setStatus(sidebar, "Generating...");
    try {
      const response = await sendRuntimeMessage({
        type: "GENERATE",
        selectedText,
        instruction: sidebar.instruction.value,
        quickActionId: null
      });
      applyRuntimeResponse(sidebar, response);
    } catch (error) {
      setStatus(
        sidebar,
        error instanceof Error ? error.message : "Unable to generate a response.",
        "error"
      );
    } finally {
      setLoading(sidebar, false);
    }
  });

  sidebar.copyButton.addEventListener("click", async () => {
    if (!sidebar.output.value.trim()) {
      setStatus(sidebar, "There is no output to copy.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(sidebar.output.value);
      setStatus(sidebar, "Copied.");
    } catch {
      setStatus(sidebar, "Unable to copy output.", "error");
    }
  });

  sidebar.saveSettingsButton.addEventListener("click", async () => {
    if (!(await saveValidatedSettings(sidebar))) return;
    setStatus(sidebar, "Settings saved.");
  });

  sidebar.testConnectionButton.addEventListener("click", async () => {
    if (!(await saveValidatedSettings(sidebar))) return;

    setLoading(sidebar, true);
    setStatus(sidebar, "Testing connection...");
    try {
      const response = await sendRuntimeMessage({ type: "TEST_CONNECTION" });
      applyRuntimeResponse(sidebar, response.ok ? { ok: true, text: "Connection works." } : response);
    } catch (error) {
      setStatus(
        sidebar,
        error instanceof Error ? error.message : "Unable to test connection.",
        "error"
      );
    } finally {
      setLoading(sidebar, false);
    }
  });

  setSidebarOpen(sidebar, false);
}

main().catch((error) => {
  console.error("[DingTalk AI Sidebar]", error);
});
