/// <reference types="vite/client" />

interface Window {
  Buffer: typeof import("buffer").Buffer;
  global: typeof globalThis;
  process: typeof import("process");
  midnight?: {
    mnLace?: import("@midnight-ntwrk/dapp-connector-api").DAppConnectorAPI;
  };
}

// Declare module for dynamically loaded contract
declare module "/contract/index.cjs" {
  export const Contract: new (initialState: Record<string, unknown>) => unknown;
}
