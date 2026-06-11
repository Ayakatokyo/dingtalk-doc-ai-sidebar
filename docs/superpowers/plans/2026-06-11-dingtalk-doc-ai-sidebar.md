# DingTalk Doc AI Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome/Edge Manifest V3 extension that injects an AI sidebar into DingTalk web document pages, reads selected text, sends it to an OpenAI-compatible API using local settings, and displays copyable AI output.

**Architecture:** Use a small TypeScript browser extension built with Vite. The content script owns the injected floating button/sidebar and selected-text reading; the background service worker owns AI API calls; shared modules define prompt building, storage, types, and message contracts.

**Tech Stack:** TypeScript, Vite, Vitest, jsdom, Manifest V3 browser extension APIs, native `fetch`.

---

## File Structure

- Create `package.json`: project scripts, dev dependencies, and package metadata.
- Create `tsconfig.json`: shared TypeScript compiler settings.
- Create `vite.config.ts`: builds the content script as a standalone IIFE and the background service worker as an ES module into `dist/`.
- Create `vitest.config.ts`: unit test configuration using jsdom.
- Create `src/shared/types.ts`: shared settings, AI request, AI response, and runtime message types.
- Create `src/shared/prompt.ts`: quick actions and prompt/message construction.
- Create `src/shared/storage.ts`: wrapper around `chrome.storage.local`.
- Create `src/background/aiClient.ts`: OpenAI-compatible request client.
- Create `src/background/index.ts`: runtime message listener for generate and test-connection requests.
- Create `src/content/selection.ts`: selected-text extraction helper.
- Create `src/content/sidebar.ts`: sidebar DOM creation and state updates.
- Create `src/content/index.ts`: content-script entry point, event wiring, and runtime messaging.
- Create `src/content/styles.css`: injected sidebar and floating button styles.
- Create `public/manifest.json`: Manifest V3 extension declaration.
- Create `tests/setup.ts`: test globals and Chrome API mocks.
- Create `tests/prompt.test.ts`: prompt builder tests.
- Create `tests/selection.test.ts`: selection helper tests.
- Create `tests/aiClient.test.ts`: AI client request and error tests.
- Create `tests/storage.test.ts`: storage wrapper tests.
- Modify `README.md`: local setup, build, test, and extension loading instructions.

## Task 1: Project Tooling and Extension Manifest

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `public/manifest.json`
- Modify: `README.md`

- [ ] **Step 1: Create package metadata and scripts**

Create `package.json`:

```json
{
  "name": "dingtalk-doc-ai-sidebar",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.283",
    "@types/node": "^22.5.0",
    "jsdom": "^24.1.1",
    "typescript": "^5.5.4",
    "vite": "^5.4.0",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Create TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["chrome", "vite/client", "vitest/globals"]
  },
  "include": ["src", "tests", "vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 3: Create Vite build config**

Create `vite.config.ts`:

```ts
import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { type UserConfig, build, defineConfig } from "vite";

function copyManifestPlugin() {
  return {
    name: "copy-manifest",
    closeBundle() {
      mkdirSync("dist", { recursive: true });
      copyFileSync("public/manifest.json", "dist/manifest.json");
    }
  };
}

const contentConfig: UserConfig = {
  build: {
    emptyOutDir: true,
    outDir: "dist",
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/content/index.ts"),
      name: "DingTalkAiSidebarContent",
      formats: ["iife"],
      fileName: () => "content.js"
    }
  },
  plugins: [copyManifestPlugin()]
};

const backgroundBuildPlugin = {
  name: "background-build",
  async closeBundle() {
    await build({
      configFile: false,
      build: backgroundBuild.build
    });
  }
};

const backgroundBuild: UserConfig = {
  build: {
    emptyOutDir: false,
    outDir: "dist",
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/background/index.ts"),
      formats: ["es"],
      fileName: () => "background.js"
    }
  }
};

contentConfig.plugins = [copyManifestPlugin(), backgroundBuildPlugin];

export default defineConfig(contentConfig);
```

- [ ] **Step 4: Create Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["tests/setup.ts"],
    clearMocks: true,
    restoreMocks: true
  }
});
```

- [ ] **Step 5: Create Chrome API test mock**

Create `tests/setup.ts`:

```ts
type Listener = (...args: unknown[]) => void;

const localStore = new Map<string, unknown>();
const messageListeners: Listener[] = [];

globalThis.chrome = {
  storage: {
    local: {
      async get(keys?: string | string[] | Record<string, unknown> | null) {
        if (!keys) return Object.fromEntries(localStore.entries());
        if (typeof keys === "string") return { [keys]: localStore.get(keys) };
        if (Array.isArray(keys)) {
          return Object.fromEntries(keys.map((key) => [key, localStore.get(key)]));
        }
        return Object.fromEntries(
          Object.entries(keys).map(([key, fallback]) => [
            key,
            localStore.has(key) ? localStore.get(key) : fallback
          ])
        );
      },
      async set(values: Record<string, unknown>) {
        for (const [key, value] of Object.entries(values)) localStore.set(key, value);
      },
      async remove(keys: string | string[]) {
        for (const key of Array.isArray(keys) ? keys : [keys]) localStore.delete(key);
      },
      async clear() {
        localStore.clear();
      }
    }
  },
  runtime: {
    onMessage: {
      addListener(listener: Listener) {
        messageListeners.push(listener);
      }
    },
    sendMessage: vi.fn()
  }
} as unknown as typeof chrome;

beforeEach(async () => {
  await chrome.storage.local.clear();
  messageListeners.length = 0;
});
```

- [ ] **Step 6: Create extension manifest**

Create `public/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "DingTalk Doc AI Sidebar",
  "description": "Use selected DingTalk document text with an OpenAI-compatible AI sidebar.",
  "version": "0.1.0",
  "permissions": ["storage"],
  "host_permissions": ["https://*.dingtalk.com/*", "https://*.aliwork.com/*", "https://*/*"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://*.dingtalk.com/*", "https://*.aliwork.com/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_title": "DingTalk Doc AI Sidebar"
  }
}
```

- [ ] **Step 7: Update README with setup instructions**

Replace `README.md` with:

````md
# DingTalk Doc AI Sidebar

Chrome/Edge extension for using selected DingTalk web document text with an OpenAI-compatible AI sidebar.

## Development

```bash
npm install
npm run test
npm run typecheck
npm run build
```

## Load in Chrome or Edge

1. Run `npm run build`.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable developer mode.
4. Choose "Load unpacked".
5. Select the generated `dist` directory.

## MVP Scope

- Reads the current selected text in DingTalk web documents.
- Sends selected text plus an instruction to a configured OpenAI-compatible API.
- Displays generated output in a sidebar.
- Lets the user copy output and paste it manually.
- Does not automatically modify DingTalk documents.
````

- [ ] **Step 8: Install dependencies**

Run:

```bash
npm install
```

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 9: Run typecheck before source exists**

Run:

```bash
npm run typecheck
```

Expected: `typecheck` passes with no source errors.

- [ ] **Step 10: Commit project tooling**

Run:

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts tests/setup.ts public/manifest.json README.md
git commit -m "chore: scaffold extension tooling"
```

Expected: commit succeeds.

## Task 2: Shared Types and Prompt Builder

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/prompt.ts`
- Create: `tests/prompt.test.ts`

- [ ] **Step 1: Write failing prompt tests**

Create `tests/prompt.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildChatMessages, getQuickActionInstruction, QUICK_ACTIONS } from "../src/shared/prompt";

describe("prompt builder", () => {
  it("defines the expected quick actions", () => {
    expect(QUICK_ACTIONS.map((action) => action.id)).toEqual([
      "polish",
      "shorten",
      "expand",
      "formalize",
      "translate_zh",
      "translate_en"
    ]);
  });

  it("returns a quick action instruction", () => {
    expect(getQuickActionInstruction("shorten")).toContain("Shorten");
  });

  it("builds chat messages with selected text and custom instruction", () => {
    const messages = buildChatMessages({
      selectedText: "这是一段草稿文字。",
      instruction: "改得更正式",
      quickActionId: null
    });

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
    expect(messages[1].content).toContain("改得更正式");
    expect(messages[1].content).toContain("这是一段草稿文字。");
  });

  it("uses quick action when custom instruction is blank", () => {
    const messages = buildChatMessages({
      selectedText: "Hello",
      instruction: " ",
      quickActionId: "translate_zh"
    });

    expect(messages[1].content).toContain("Translate");
    expect(messages[1].content).toContain("Chinese");
  });

  it("throws for empty selected text", () => {
    expect(() =>
      buildChatMessages({
        selectedText: "  ",
        instruction: "polish",
        quickActionId: null
      })
    ).toThrow("Selected text is required.");
  });
});
```

- [ ] **Step 2: Run prompt tests and verify they fail**

Run:

```bash
npm run test -- tests/prompt.test.ts
```

Expected: FAIL because `src/shared/prompt.ts` does not exist.

- [ ] **Step 3: Create shared types**

Create `src/shared/types.ts`:

```ts
export type QuickActionId =
  | "polish"
  | "shorten"
  | "expand"
  | "formalize"
  | "translate_zh"
  | "translate_en";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface AiSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface GenerateInput {
  selectedText: string;
  instruction: string;
  quickActionId: QuickActionId | null;
}

export interface GenerateRequest extends GenerateInput {
  type: "GENERATE";
}

export interface TestConnectionRequest {
  type: "TEST_CONNECTION";
}

export type RuntimeRequest = GenerateRequest | TestConnectionRequest;

export interface RuntimeSuccess {
  ok: true;
  text: string;
}

export interface RuntimeFailure {
  ok: false;
  error: string;
}

export type RuntimeResponse = RuntimeSuccess | RuntimeFailure;
```

- [ ] **Step 4: Implement prompt builder**

Create `src/shared/prompt.ts`:

```ts
import type { ChatMessage, GenerateInput, QuickActionId } from "./types";

export interface QuickAction {
  id: QuickActionId;
  label: string;
  instruction: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "polish",
    label: "Polish",
    instruction: "Polish the selected text while preserving its original meaning."
  },
  {
    id: "shorten",
    label: "Shorten",
    instruction: "Shorten the selected text and keep the key information."
  },
  {
    id: "expand",
    label: "Expand",
    instruction: "Expand the selected text with clearer detail while avoiding unsupported facts."
  },
  {
    id: "formalize",
    label: "Formalize",
    instruction: "Rewrite the selected text in a more formal and professional tone."
  },
  {
    id: "translate_zh",
    label: "To Chinese",
    instruction: "Translate the selected text into Chinese."
  },
  {
    id: "translate_en",
    label: "To English",
    instruction: "Translate the selected text into English."
  }
];

const SYSTEM_PROMPT = [
  "You are an AI writing assistant for document editing.",
  "Edit only the text provided by the user.",
  "Preserve the original meaning unless the instruction explicitly asks for a transformation.",
  "Do not invent unsupported facts.",
  "For rewrite, polish, shorten, expand, formalize, or translation tasks, return only the final edited text."
].join(" ");

export function getQuickActionInstruction(id: QuickActionId): string {
  const action = QUICK_ACTIONS.find((item) => item.id === id);
  if (!action) throw new Error(`Unknown quick action: ${id}`);
  return action.instruction;
}

export function buildChatMessages(input: GenerateInput): ChatMessage[] {
  const selectedText = input.selectedText.trim();
  if (!selectedText) throw new Error("Selected text is required.");

  const instruction =
    input.instruction.trim() ||
    (input.quickActionId ? getQuickActionInstruction(input.quickActionId) : "");

  if (!instruction) throw new Error("Instruction is required.");

  return [
    {
      role: "system",
      content: SYSTEM_PROMPT
    },
    {
      role: "user",
      content: [
        `Instruction: ${instruction}`,
        "",
        "Selected text:",
        selectedText
      ].join("\n")
    }
  ];
}
```

- [ ] **Step 5: Run prompt tests**

Run:

```bash
npm run test -- tests/prompt.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit shared prompt code**

Run:

```bash
git add src/shared/types.ts src/shared/prompt.ts tests/prompt.test.ts
git commit -m "feat: add prompt builder"
```

Expected: commit succeeds.

## Task 3: Local Settings Storage

**Files:**
- Create: `src/shared/storage.ts`
- Create: `tests/storage.test.ts`

- [ ] **Step 1: Write failing storage tests**

Create `tests/storage.test.ts`:

```ts
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
```

- [ ] **Step 2: Run storage tests and verify they fail**

Run:

```bash
npm run test -- tests/storage.test.ts
```

Expected: FAIL because `src/shared/storage.ts` does not exist.

- [ ] **Step 3: Implement storage module**

Create `src/shared/storage.ts`:

```ts
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
```

- [ ] **Step 4: Run storage tests**

Run:

```bash
npm run test -- tests/storage.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit storage module**

Run:

```bash
git add src/shared/storage.ts tests/storage.test.ts
git commit -m "feat: add local settings storage"
```

Expected: commit succeeds.

## Task 4: Background AI Client and Runtime Messages

**Files:**
- Create: `src/background/aiClient.ts`
- Create: `src/background/index.ts`
- Create: `tests/aiClient.test.ts`

- [ ] **Step 1: Write failing AI client tests**

Create `tests/aiClient.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Run AI client tests and verify they fail**

Run:

```bash
npm run test -- tests/aiClient.test.ts
```

Expected: FAIL because `src/background/aiClient.ts` does not exist.

- [ ] **Step 3: Implement AI client**

Create `src/background/aiClient.ts`:

```ts
import type { AiSettings, ChatMessage } from "../shared/types";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

function chatCompletionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

export async function callOpenAiCompatibleApi(
  settings: AiSettings,
  messages: ChatMessage[]
): Promise<string> {
  const response = await fetch(chatCompletionsUrl(settings.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      temperature: 0.3
    })
  });

  const data = (await response.json().catch(() => ({}))) as ChatCompletionResponse;

  if (!response.ok) {
    throw new Error(`AI API request failed: ${data.error?.message || response.statusText}`);
  }

  const text = data.choices?.[0]?.message?.content?.trim() || "";
  if (!text) throw new Error("AI API returned an empty response.");
  return text;
}
```

- [ ] **Step 4: Implement background runtime message handler**

Create `src/background/index.ts`:

```ts
import { buildChatMessages } from "../shared/prompt";
import { getAiSettings, validateAiSettings } from "../shared/storage";
import type { RuntimeRequest, RuntimeResponse } from "../shared/types";
import { callOpenAiCompatibleApi } from "./aiClient";

async function handleRequest(request: RuntimeRequest): Promise<RuntimeResponse> {
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

chrome.runtime.onMessage.addListener((request: RuntimeRequest, _sender, sendResponse) => {
  handleRequest(request).then(sendResponse);
  return true;
});
```

- [ ] **Step 5: Run AI client tests**

Run:

```bash
npm run test -- tests/aiClient.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run all current tests and typecheck**

Run:

```bash
npm run test
npm run typecheck
```

Expected: PASS for all tests and typecheck.

- [ ] **Step 7: Commit background AI code**

Run:

```bash
git add src/background/aiClient.ts src/background/index.ts tests/aiClient.test.ts
git commit -m "feat: add background AI requests"
```

Expected: commit succeeds.

## Task 5: Selection Reading

**Files:**
- Create: `src/content/selection.ts`
- Create: `tests/selection.test.ts`

- [ ] **Step 1: Write failing selection tests**

Create `tests/selection.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readSelectedText } from "../src/content/selection";

describe("selection reading", () => {
  it("returns trimmed selected text", () => {
    const paragraph = document.createElement("p");
    paragraph.textContent = "  DingTalk selected text  ";
    document.body.append(paragraph);

    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    expect(readSelectedText()).toBe("DingTalk selected text");
  });

  it("returns an empty string when nothing is selected", () => {
    window.getSelection()?.removeAllRanges();
    expect(readSelectedText()).toBe("");
  });
});
```

- [ ] **Step 2: Run selection tests and verify they fail**

Run:

```bash
npm run test -- tests/selection.test.ts
```

Expected: FAIL because `src/content/selection.ts` does not exist.

- [ ] **Step 3: Implement selection helper**

Create `src/content/selection.ts`:

```ts
export function readSelectedText(): string {
  return window.getSelection()?.toString().trim() || "";
}
```

- [ ] **Step 4: Run selection tests**

Run:

```bash
npm run test -- tests/selection.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit selection helper**

Run:

```bash
git add src/content/selection.ts tests/selection.test.ts
git commit -m "feat: read selected document text"
```

Expected: commit succeeds.

## Task 6: Sidebar UI and Content Script Wiring

**Files:**
- Create: `src/content/sidebar.ts`
- Create: `src/content/index.ts`
- Create: `src/content/styles.css`

- [ ] **Step 1: Create sidebar UI module**

Create `src/content/sidebar.ts`:

```ts
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
        <label>Selected text</label>
        <textarea class="dai-selected" readonly placeholder="Select text in the DingTalk document, then open this sidebar."></textarea>
      </section>
      <section class="dai-section">
        <label>Quick actions</label>
        <div class="dai-actions"></div>
      </section>
      <section class="dai-section">
        <label>Instruction</label>
        <textarea class="dai-instruction" placeholder="Example: rewrite this in a more formal tone"></textarea>
        <button class="dai-generate" type="button">Generate</button>
      </section>
      <section class="dai-section">
        <label>Output</label>
        <textarea class="dai-output" readonly placeholder="AI output will appear here."></textarea>
        <button class="dai-copy" type="button">Copy output</button>
      </section>
      <details class="dai-settings">
        <summary>Settings</summary>
        <label>Base URL<input class="dai-base-url" type="url" placeholder="https://api.openai.com/v1"></label>
        <label>API Key<input class="dai-api-key" type="password" placeholder="sk-..."></label>
        <label>Model<input class="dai-model" type="text" placeholder="gpt-4o-mini"></label>
        <div class="dai-settings-buttons">
          <button class="dai-save-settings" type="button">Save</button>
          <button class="dai-test-connection" type="button">Test</button>
        </div>
      </details>
      <div class="dai-status" role="status"></div>
    </aside>
  `;

  const actions = root.querySelector<HTMLElement>(".dai-actions");
  if (!actions) throw new Error("Quick actions container missing.");
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
    toggleButton: root.querySelector(".dai-toggle")!,
    panel: root.querySelector(".dai-panel")!,
    selectedText: root.querySelector(".dai-selected")!,
    instruction: root.querySelector(".dai-instruction")!,
    output: root.querySelector(".dai-output")!,
    status: root.querySelector(".dai-status")!,
    generateButton: root.querySelector(".dai-generate")!,
    copyButton: root.querySelector(".dai-copy")!,
    saveSettingsButton: root.querySelector(".dai-save-settings")!,
    testConnectionButton: root.querySelector(".dai-test-connection")!,
    baseUrl: root.querySelector(".dai-base-url")!,
    apiKey: root.querySelector(".dai-api-key")!,
    model: root.querySelector(".dai-model")!
  };

  elements.toggleButton.addEventListener("click", () => setSidebarOpen(elements, true));
  root.querySelector(".dai-close")?.addEventListener("click", () => setSidebarOpen(elements, false));

  return elements;
}

export function setSidebarOpen(elements: SidebarElements, open: boolean): void {
  elements.panel.dataset.open = String(open);
}

export function setStatus(elements: SidebarElements, message: string, kind: "info" | "error" = "info"): void {
  elements.status.textContent = message;
  elements.status.dataset.kind = kind;
}

export function setLoading(elements: SidebarElements, loading: boolean): void {
  elements.generateButton.disabled = loading;
  elements.testConnectionButton.disabled = loading;
  elements.generateButton.textContent = loading ? "Generating..." : "Generate";
}

export function applyRuntimeResponse(elements: SidebarElements, response: RuntimeResponse): void {
  if (response.ok) {
    elements.output.value = response.text;
    setStatus(elements, "Done.");
  } else {
    setStatus(elements, response.error, "error");
  }
}

export function quickActionIdFromButton(button: HTMLElement): QuickActionId | null {
  return (button.dataset.actionId || null) as QuickActionId | null;
}
```

- [ ] **Step 2: Create sidebar styles**

Create `src/content/styles.css`:

```css
#dingtalk-ai-sidebar-root {
  position: fixed;
  z-index: 2147483647;
  font-family: Arial, "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #1f2937;
}

#dingtalk-ai-sidebar-root .dai-toggle {
  position: fixed;
  right: 18px;
  bottom: 96px;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}

#dingtalk-ai-sidebar-root .dai-panel {
  position: fixed;
  top: 72px;
  right: 18px;
  width: min(380px, calc(100vw - 36px));
  max-height: calc(100vh - 96px);
  display: none;
  overflow: auto;
  padding: 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 16px 42px rgba(0, 0, 0, 0.18);
  box-sizing: border-box;
}

#dingtalk-ai-sidebar-root .dai-panel[data-open="true"] {
  display: block;
}

#dingtalk-ai-sidebar-root .dai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

#dingtalk-ai-sidebar-root .dai-close,
#dingtalk-ai-sidebar-root button {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #f8fafc;
  color: #111827;
  cursor: pointer;
}

#dingtalk-ai-sidebar-root .dai-section {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
}

#dingtalk-ai-sidebar-root label,
#dingtalk-ai-sidebar-root summary {
  font-size: 12px;
  font-weight: 700;
}

#dingtalk-ai-sidebar-root textarea,
#dingtalk-ai-sidebar-root input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 8px;
  font: inherit;
  font-size: 13px;
}

#dingtalk-ai-sidebar-root textarea {
  min-height: 76px;
  resize: vertical;
}

#dingtalk-ai-sidebar-root .dai-output {
  min-height: 128px;
}

#dingtalk-ai-sidebar-root .dai-actions,
#dingtalk-ai-sidebar-root .dai-settings-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

#dingtalk-ai-sidebar-root button {
  min-height: 32px;
  padding: 0 10px;
}

#dingtalk-ai-sidebar-root .dai-generate {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

#dingtalk-ai-sidebar-root .dai-status {
  min-height: 18px;
  font-size: 12px;
  color: #475569;
}

#dingtalk-ai-sidebar-root .dai-status[data-kind="error"] {
  color: #b91c1c;
}

#dingtalk-ai-sidebar-root .dai-settings {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}
```

- [ ] **Step 3: Create content script wiring**

Create `src/content/index.ts`:

```ts
import styles from "./styles.css?inline";
import { QUICK_ACTIONS } from "../shared/prompt";
import { getAiSettings, saveAiSettings, validateAiSettings } from "../shared/storage";
import type { RuntimeRequest, RuntimeResponse } from "../shared/types";
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

async function main(): Promise<void> {
  if (document.getElementById("dingtalk-ai-sidebar-root")) return;

  injectStyles();
  const sidebar = createSidebar();
  const settings = await getAiSettings();
  sidebar.baseUrl.value = settings.baseUrl;
  sidebar.apiKey.value = settings.apiKey;
  sidebar.model.value = settings.model;

  sidebar.toggleButton.addEventListener("click", () => {
    sidebar.selectedText.value = readSelectedText();
    if (!sidebar.selectedText.value) {
      setStatus(sidebar, "Select text in the document first.", "error");
    }
  });

  sidebar.root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.classList.contains("dai-action")) return;

    const actionId = quickActionIdFromButton(target);
    const action = QUICK_ACTIONS.find((item) => item.id === actionId);
    if (action) sidebar.instruction.value = action.instruction;
  });

  sidebar.generateButton.addEventListener("click", async () => {
    sidebar.selectedText.value = readSelectedText() || sidebar.selectedText.value;
    if (!sidebar.selectedText.value.trim()) {
      setStatus(sidebar, "Select text in the document first.", "error");
      return;
    }

    setLoading(sidebar, true);
    setStatus(sidebar, "Generating...");
    const response = await sendRuntimeMessage({
      type: "GENERATE",
      selectedText: sidebar.selectedText.value,
      instruction: sidebar.instruction.value,
      quickActionId: null
    });
    applyRuntimeResponse(sidebar, response);
    setLoading(sidebar, false);
  });

  sidebar.copyButton.addEventListener("click", async () => {
    if (!sidebar.output.value.trim()) {
      setStatus(sidebar, "There is no output to copy.", "error");
      return;
    }
    await navigator.clipboard.writeText(sidebar.output.value);
    setStatus(sidebar, "Copied.");
  });

  sidebar.saveSettingsButton.addEventListener("click", async () => {
    const nextSettings = {
      baseUrl: sidebar.baseUrl.value,
      apiKey: sidebar.apiKey.value,
      model: sidebar.model.value
    };
    const error = validateAiSettings(nextSettings);
    if (error) {
      setStatus(sidebar, error, "error");
      return;
    }
    await saveAiSettings(nextSettings);
    setStatus(sidebar, "Settings saved.");
  });

  sidebar.testConnectionButton.addEventListener("click", async () => {
    setLoading(sidebar, true);
    setStatus(sidebar, "Testing connection...");
    await saveAiSettings({
      baseUrl: sidebar.baseUrl.value,
      apiKey: sidebar.apiKey.value,
      model: sidebar.model.value
    });
    const response = await sendRuntimeMessage({ type: "TEST_CONNECTION" });
    applyRuntimeResponse(sidebar, response.ok ? { ok: true, text: "Connection works." } : response);
    setLoading(sidebar, false);
  });

  setSidebarOpen(sidebar, false);
}

main().catch((error) => {
  console.error("[DingTalk AI Sidebar]", error);
});
```

- [ ] **Step 4: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Build extension**

Run:

```bash
npm run build
```

Expected: PASS and `dist/manifest.json`, `dist/content.js`, and `dist/background.js` are generated.

- [ ] **Step 6: Commit content UI**

Run:

```bash
git add src/content/sidebar.ts src/content/index.ts src/content/styles.css
git commit -m "feat: add injected sidebar UI"
```

Expected: commit succeeds.

## Task 7: Final Documentation and Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Expand README usage notes**

Modify `README.md` to include:

```md
## Configure AI

Open a DingTalk web document, click the floating AI button, expand Settings, and enter:

- Base URL, for example `https://api.openai.com/v1`
- API Key
- Model, for example `gpt-4o-mini`

Click "Save", then "Test".

## Use With DingTalk Documents

1. Open a DingTalk web document in Chrome or Edge.
2. Select text in the document.
3. Click the floating AI button.
4. Choose a quick action or enter a custom instruction.
5. Click "Generate".
6. Copy the output and paste it back into DingTalk manually.

The extension sends only the selected text to the configured AI API. It does not upload the whole document and does not automatically write changes back to DingTalk.
```

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run test
npm run typecheck
npm run build
```

Expected: all commands PASS.

- [ ] **Step 3: Manually inspect build output**

Run:

```bash
find dist -maxdepth 2 -type f | sort
```

Expected output includes:

```text
dist/background.js
dist/content.js
dist/manifest.json
```

- [ ] **Step 4: Manually load extension**

Manual browser steps:

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable developer mode.
3. Load unpacked extension from `/Users/shuzida/Documents/钉钉文档在线使用ai编辑/dist`.
4. Open a DingTalk web document.
5. Confirm the floating `AI` button appears.
6. Select text and open the sidebar.
7. Confirm selected text appears in the sidebar.
8. Configure API settings and test connection.
9. Generate output and copy it.

Expected: all MVP interactions work without breaking DingTalk document editing.

- [ ] **Step 5: Commit final docs**

Run:

```bash
git add README.md
git commit -m "docs: add extension usage instructions"
```

Expected: commit succeeds.
