import "@testing-library/jest-dom/vitest";

// Mock localStorage
const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock URL.createObjectURL and revokeObjectURL
if (typeof window !== "undefined") {
  window.URL.createObjectURL = () => "blob:mock-url";
  window.URL.revokeObjectURL = () => {};
}
