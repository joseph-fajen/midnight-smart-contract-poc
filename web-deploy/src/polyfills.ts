import { Buffer } from "buffer";

// Polyfill Buffer for browser environment
window.Buffer = Buffer;

// Polyfill global
window.global = window.global || window;

// Polyfill process
window.process = window.process || ({ env: {} } as typeof process);

// Set network ID immediately before any SDK code loads
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
setNetworkId("preview");
console.log("Network ID set to 'preview' in polyfills");
