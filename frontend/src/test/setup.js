import "@testing-library/jest-dom/vitest";

// jsdom does not implement matchMedia, which PwaInstallPrompt (and some
// responsive UI) touches during mount.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
