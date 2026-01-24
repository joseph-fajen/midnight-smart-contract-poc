import { Buffer } from "buffer";

// Polyfill Buffer for browser environment
window.Buffer = Buffer;

// Polyfill global
window.global = window.global || window;

// Polyfill process
window.process = window.process || ({ env: {} } as typeof process);
