import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
    ENV: JSON.stringify(process.env.ENV),
    BASE_SIGNING_URL: JSON.stringify(process.env.VITE_BASE_SIGNING_URL),
    BTC_DEFAULT_FEE_RATE: JSON.stringify(process.env.VITE_BTC_DEFAULT_FEE_RATE),
    BTC_TX_BASE_URL: JSON.stringify(process.env.VITE_BTC_TX_BASE_URL),
    BTC_TESTNET: JSON.stringify(process.env.VITE_BTC_TESTNET),
    "process.env": {},
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 3000
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
  plugins: [react(), nodePolyfills()],
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  build: {
    outDir: "build",
  },
}));
