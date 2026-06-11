# DingTalk Doc AI Sidebar Browser Extension Design

## Summary

Build a Chrome/Edge browser extension that appears on DingTalk web document pages and provides an AI editing sidebar. The first version focuses on selected-text workflows: the user selects text in the DingTalk document, opens the sidebar, asks AI to rewrite or transform the selected text, then copies the generated result back into the document manually.

The extension calls an OpenAI-compatible API directly from the user's browser using locally saved settings. It does not use a backend service, does not download the whole document, and does not automatically modify the DingTalk document.

## Goals

- Provide an AI sidebar inside DingTalk web document pages.
- Read the user's current selected text from the page.
- Let the user send selected text plus an instruction to an OpenAI-compatible model.
- Support common editing actions such as polish, shorten, expand, formalize, and translate.
- Display generated text in the sidebar with a copy button.
- Store `base_url`, `api_key`, and `model` locally in extension storage.
- Keep the first version stable by avoiding automatic document write-back.

## Non-Goals

- No automatic replacement of selected text in DingTalk documents.
- No backend proxy or server-side API key handling.
- No whole-document export, upload, or import.
- No DingTalk Open Platform integration in the first version.
- No multi-user collaboration features.
- No document version management or change tracking.

## Target User Flow

1. The user opens a DingTalk web document in Chrome or Edge.
2. The extension detects the page and shows a small floating AI button.
3. The user selects text in the document.
4. The user opens the AI sidebar.
5. The sidebar displays the currently selected text.
6. The user chooses a quick action or types a custom instruction.
7. The extension sends the selected text and instruction to the configured AI API.
8. The AI result appears in an output area inside the sidebar.
9. The user clicks copy and manually pastes the result back into DingTalk.

## Product Scope

### Sidebar

The sidebar should be injected into the DingTalk document page by the extension content script. It should be visually separate from the document editor and should not cover the main editing area more than necessary.

Required sidebar areas:

- Selected text preview.
- Custom instruction input.
- Quick action buttons.
- Generate button.
- Output text area.
- Copy output button.
- Settings entry point.
- Error and loading states.

### Quick Actions

The first version should include a small set of common actions:

- Polish.
- Shorten.
- Expand.
- Formalize.
- Translate to Chinese.
- Translate to English.

Each quick action fills or sends a predefined instruction while still allowing custom instructions.

### Settings

Settings should be simple and local:

- `base_url`: OpenAI-compatible API base URL.
- `api_key`: API key.
- `model`: Model name.

The settings UI should include a save action and a test connection action. The test action sends a minimal request to the configured OpenAI-compatible endpoint and reports success or the returned error. API keys are stored in browser extension storage and are never sent anywhere except the configured AI API endpoint.

## Architecture

### Browser Extension

Use a Manifest V3 browser extension.

Main parts:

- `manifest.json`: declares permissions, content script matches, extension pages, and host permissions.
- Content script: injects the floating button and sidebar into DingTalk document pages, reads selected text, and coordinates UI events.
- Background service worker: handles AI API calls and keeps cross-origin requests out of the content script.
- Settings page or sidebar settings panel: manages local API configuration.
- AI client module: sends OpenAI-compatible chat completion requests.
- Prompt builder module: converts selected text, quick action, and user instruction into model messages.
- Storage module: reads and writes local extension settings.

### Page Matching

The extension should run only on DingTalk web document domains and paths. The exact match patterns should be verified during implementation against the user's actual DingTalk document URLs.

Initial match strategy:

- Use conservative DingTalk document host patterns.
- Keep the match list easy to update.
- Avoid injecting into unrelated websites.

### Selection Reading

The first implementation should use the browser selection API:

- Read `window.getSelection()?.toString()`.
- Trim whitespace.
- Show a clear empty-selection state if no text is available.

DingTalk's editor may use complex DOM structures, so selection reading should be treated as the first compatibility point to verify. If plain selection reading is unreliable, the implementation can add focused fallbacks after inspecting the actual page structure.

## AI Request Design

Use an OpenAI-compatible chat completions request.

Configuration:

- `base_url`: user-provided base URL.
- `api_key`: user-provided bearer token.
- `model`: user-provided model name.

Prompt inputs:

- Selected text.
- User instruction or selected quick action.
- A fixed system instruction that tells the model to edit only the provided text and return the revised text directly unless the user asks for explanation.

Default behavior:

- Preserve the original meaning.
- Keep formatting where possible.
- Do not invent unsupported facts.
- Return only the edited result for rewrite actions.

## Error Handling

The sidebar should handle these cases clearly:

- No selected text.
- Missing `base_url`, `api_key`, or `model`.
- Invalid API configuration.
- Network failure.
- API authentication failure.
- Rate limit or quota failure.
- Empty model response.
- Request in progress.

Errors should appear inside the sidebar and should not disrupt the DingTalk page.

## Privacy and Safety

- Only selected text is sent to the AI API.
- The full document is not read or uploaded in the first version.
- API settings stay in local browser extension storage.
- Generated text is not automatically written back into DingTalk.
- The sidebar should show the selected text before sending so the user can see what will be uploaded.

## Testing Plan

Manual tests:

- Extension loads on DingTalk web document pages.
- Extension does not load on unrelated pages.
- Floating button opens and closes the sidebar.
- Sidebar reads selected text correctly.
- Empty selection shows a useful prompt.
- Settings save and reload correctly.
- A valid OpenAI-compatible endpoint returns output.
- API errors show readable messages.
- Copy button copies the generated output.
- The DingTalk editor remains usable while the sidebar is open.

Automated tests, if the project setup supports them:

- Prompt builder unit tests.
- Storage module unit tests.
- AI client request-shape tests with mocked fetch.
- Sidebar state tests for loading, error, and success states.

## Implementation Notes

The first version should favor simple, inspectable code over heavy abstraction. The highest-risk area is DingTalk page compatibility, especially selected text extraction. AI API calls should go through the background service worker so host permissions and request handling stay centralized.

Automatic write-back should stay out of scope until selected-text reading, AI calls, output display, and copy workflows are reliable in daily use.
