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

## MVP Scope

- Reads the current selected text in DingTalk web documents.
- Sends selected text plus an instruction to a configured OpenAI-compatible API.
- Displays generated output in a sidebar.
- Lets the user copy output and paste it manually.
- Does not automatically modify DingTalk documents.
