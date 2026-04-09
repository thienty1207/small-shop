import "@testing-library/jest-dom";

// Tell React 18 test utils that this is an act-enabled environment.
Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  value: true,
  writable: true,
});

const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

const SILENCED_WARNING_PATTERNS = [
  "React Router Future Flag Warning",
  "The current testing environment is not configured to support act",
  "quill Cannot register",
  "browsers data (caniuse-lite) is",
];

function shouldSilenceConsole(args: unknown[]): boolean {
  const text = args
    .map((item) => (typeof item === "string" ? item : ""))
    .join(" ");

  return SILENCED_WARNING_PATTERNS.some((pattern) => text.includes(pattern));
}

console.warn = (...args: unknown[]) => {
  if (shouldSilenceConsole(args)) return;
  originalConsoleWarn(...args);
};

console.error = (...args: unknown[]) => {
  if (shouldSilenceConsole(args)) return;
  originalConsoleError(...args);
};

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Polyfill localStorage for jsdom (used by AuthContext)
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
  root = null;
  rootMargin = "0px";
  thresholds = [0];
}

Object.defineProperty(window, "IntersectionObserver", {
  value: MockIntersectionObserver,
  writable: true,
});

Object.defineProperty(globalThis, "IntersectionObserver", {
  value: MockIntersectionObserver,
  writable: true,
});
