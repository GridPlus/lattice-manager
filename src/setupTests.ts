import "@testing-library/jest-dom/extend-expect";
import dotenv from 'dotenv'

Object.defineProperty(globalThis, "matchMedia", {
  writable: true,
  value: ((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

console.warn = jest.fn();

dotenv.config()