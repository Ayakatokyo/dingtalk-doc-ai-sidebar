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
