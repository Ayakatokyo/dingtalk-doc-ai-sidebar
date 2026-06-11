import { QUICK_ACTIONS } from "../shared/prompt";
import type { QuickActionId, RuntimeResponse } from "../shared/types";

export interface SidebarElements {
  root: HTMLElement;
  toggleButton: HTMLButtonElement;
  panel: HTMLElement;
  selectedText: HTMLTextAreaElement;
  instruction: HTMLTextAreaElement;
  output: HTMLTextAreaElement;
  status: HTMLElement;
  generateButton: HTMLButtonElement;
  copyButton: HTMLButtonElement;
  saveSettingsButton: HTMLButtonElement;
  testConnectionButton: HTMLButtonElement;
  baseUrl: HTMLInputElement;
  apiKey: HTMLInputElement;
  model: HTMLInputElement;
}

function requireElement<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Sidebar element missing: ${selector}`);
  return element;
}

export function createSidebar(): SidebarElements {
  const root = document.createElement("div");
  root.id = "dingtalk-ai-sidebar-root";
  root.innerHTML = `
    <button class="dai-toggle" type="button" aria-label="Open AI sidebar">AI</button>
    <aside class="dai-panel" data-open="false" aria-label="AI editing sidebar">
      <header class="dai-header">
        <strong>AI Editor</strong>
        <button class="dai-close" type="button" aria-label="Close AI sidebar">x</button>
      </header>
      <section class="dai-section">
        <label for="dai-selected-text">Selected text</label>
        <textarea id="dai-selected-text" class="dai-selected" readonly placeholder="Select text in the DingTalk document, then open this sidebar."></textarea>
      </section>
      <section class="dai-section">
        <span class="dai-label">Quick actions</span>
        <div class="dai-actions"></div>
      </section>
      <section class="dai-section">
        <label for="dai-instruction">Instruction</label>
        <textarea id="dai-instruction" class="dai-instruction" placeholder="Example: rewrite this in a more formal tone"></textarea>
        <button class="dai-generate" type="button">Generate</button>
      </section>
      <section class="dai-section">
        <label for="dai-output">Output</label>
        <textarea id="dai-output" class="dai-output" readonly placeholder="AI output will appear here."></textarea>
        <button class="dai-copy" type="button">Copy output</button>
      </section>
      <details class="dai-settings">
        <summary>Settings</summary>
        <label for="dai-base-url">Base URL</label>
        <input id="dai-base-url" class="dai-base-url" type="url" placeholder="https://api.openai.com/v1">
        <label for="dai-api-key">API key</label>
        <input id="dai-api-key" class="dai-api-key" type="password" placeholder="sk-...">
        <label for="dai-model">Model</label>
        <input id="dai-model" class="dai-model" type="text" placeholder="gpt-4o-mini">
        <div class="dai-settings-buttons">
          <button class="dai-save-settings" type="button">Save</button>
          <button class="dai-test-connection" type="button">Test</button>
        </div>
      </details>
      <div class="dai-status" role="status" aria-live="polite"></div>
    </aside>
  `;

  const actions = requireElement<HTMLElement>(root, ".dai-actions");
  for (const action of QUICK_ACTIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dai-action";
    button.dataset.actionId = action.id;
    button.textContent = action.label;
    actions.append(button);
  }

  document.documentElement.append(root);

  const elements: SidebarElements = {
    root,
    toggleButton: requireElement(root, ".dai-toggle"),
    panel: requireElement(root, ".dai-panel"),
    selectedText: requireElement(root, ".dai-selected"),
    instruction: requireElement(root, ".dai-instruction"),
    output: requireElement(root, ".dai-output"),
    status: requireElement(root, ".dai-status"),
    generateButton: requireElement(root, ".dai-generate"),
    copyButton: requireElement(root, ".dai-copy"),
    saveSettingsButton: requireElement(root, ".dai-save-settings"),
    testConnectionButton: requireElement(root, ".dai-test-connection"),
    baseUrl: requireElement(root, ".dai-base-url"),
    apiKey: requireElement(root, ".dai-api-key"),
    model: requireElement(root, ".dai-model")
  };

  elements.toggleButton.addEventListener("click", () => {
    setSidebarOpen(elements, elements.panel.dataset.open !== "true");
  });
  requireElement<HTMLButtonElement>(root, ".dai-close").addEventListener("click", () => {
    setSidebarOpen(elements, false);
  });

  return elements;
}

export function setSidebarOpen(elements: SidebarElements, open: boolean): void {
  elements.panel.dataset.open = String(open);
  elements.toggleButton.setAttribute("aria-expanded", String(open));
}

export function setStatus(
  elements: SidebarElements,
  message: string,
  kind: "info" | "error" = "info"
): void {
  elements.status.textContent = message;
  elements.status.dataset.kind = kind;
}

export function setLoading(elements: SidebarElements, loading: boolean, label = "Generating..."): void {
  elements.root.dataset.loading = String(loading);
  elements.generateButton.disabled = loading;
  elements.testConnectionButton.disabled = loading;
  elements.saveSettingsButton.disabled = loading;
  elements.generateButton.textContent = loading && label !== "Testing..." ? label : "Generate";
  elements.testConnectionButton.textContent = loading && label === "Testing..." ? label : "Test";
}

export function applyRuntimeResponse(elements: SidebarElements, response: RuntimeResponse): void {
  if (response.ok) {
    elements.output.value = response.text;
    setStatus(elements, "Done.");
    return;
  }

  setStatus(elements, response.error, "error");
}

export function quickActionIdFromButton(button: HTMLElement): QuickActionId | null {
  const actionId = button.dataset.actionId;
  return QUICK_ACTIONS.some((action) => action.id === actionId) ? (actionId as QuickActionId) : null;
}
