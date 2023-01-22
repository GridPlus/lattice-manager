import "@testing-library/vi-dom/extend-expect";
import { vi } from "vitest";

Object.defineProperty(globalThis, "matchMedia", {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

console.warn = vi.fn();
