import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
    "process.env": {},
  },
  server: {
    port: 3000,
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
