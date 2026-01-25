import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { viteCommonjs } from "@originjs/vite-plugin-commonjs";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    viteCommonjs(),
    nodePolyfills({
      include: ["buffer", "process", "util", "stream", "crypto"],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  optimizeDeps: {
    exclude: [
      "@midnight-ntwrk/compact-runtime",
      "@midnight-ntwrk/onchain-runtime",
    ],
    esbuildOptions: {
      target: "esnext",
    },
  },
  build: {
    target: "esnext",
  },
});
