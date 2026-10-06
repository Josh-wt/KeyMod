// An in-memory iframe host for testing the installed Reddit SDK's messages.
export const effects: Array<{ immersiveMode?: { immersiveMode: number; entryUrl?: string } }> = [];
export const host = {
  context: { subredditName: 'example' },
  token: 'test-token',
  entrypoints: { workspace: 'https://example.devvit.net/index.html' },
  webViewMode: 1,
};
Object.assign(globalThis, {
  devvit: host,
  addEventListener: () => {},
  removeEventListener: () => {},
  parent: { postMessage: (effect: typeof effects[number]) => effects.push(effect) },
});
