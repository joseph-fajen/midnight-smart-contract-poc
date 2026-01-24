import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { viteCommonjs } from "@originjs/vite-plugin-commonjs";

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait(), viteCommonjs()],
  resolve: {
    alias: {
      buffer: "buffer",
      process: "process/browser",
      crypto: "crypto-browserify",
      stream: "stream-browserify",
    },
  },
  optimizeDeps: {
    include: ["buffer", "process"],
    esbuildOptions: {
      target: "esnext",
    },
  },
  build: {
    target: "esnext",
  },
});
