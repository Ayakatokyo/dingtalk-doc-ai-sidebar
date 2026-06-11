# DingTalk Doc AI Sidebar

Chrome/Edge extension for using selected DingTalk web document text with an OpenAI-compatible AI sidebar.

## Development

```bash
npm install
npm run test
npm run typecheck
npm run build
```

`npm run build` requires the extension source entry files, which are implemented after the initial tooling scaffold.

## Load in Chrome or Edge

After the extension source files are implemented:

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
