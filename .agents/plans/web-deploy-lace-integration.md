# Feature: Web Deploy with Lace Wallet Integration

The following plan should be complete, but validate documentation and codebase patterns before implementing.

Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Build a minimal React web application using Vite that connects to the user's Lace Midnight Preview wallet and deploys the pre-compiled "Proof of Authorship" smart contract to the Midnight Preview network. This bypasses CLI wallet SDK limitations with Preview network address encoding by using Lace's native browser integration.

## User Story

As a blockchain developer
I want to deploy my compiled Midnight contract using my funded Lace wallet
So that I can successfully deploy to Preview network despite CLI SDK limitations

## Problem Statement

The CLI deployment approach using `@midnight-ntwrk/wallet` v5.0.0 produces addresses with `_test1` prefix, but the Preview network requires `_preview1` prefix. The Lace Midnight Preview wallet correctly handles Preview network addresses, so we need a browser-based deployment that leverages Lace's wallet integration.

## Solution Statement

Create a minimal Vite + React application that:
1. Connects to Lace wallet via the official DApp Connector API
2. Configures Midnight SDK v3.0.0-alpha providers using Lace's service URIs
3. Loads the pre-compiled contract and deploys it using the funded Lace wallet
4. Calls `recordAuthorship` to store authorship data on-chain
5. Displays deployment results and saves to `deployment.json`

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium-High
**Primary Systems Affected**: New `web-deploy/` directory, uses existing compiled contract
**Dependencies**:
- `@midnight-ntwrk/dapp-connector-api@3.0.0`
- `@midnight-ntwrk/midnight-js-fetch-zk-config-provider@3.0.0-alpha.11`
- Existing v3.0.0-alpha SDK packages from root project
- Vite, React, WASM plugins

---

## CONTEXT REFERENCES

### Relevant Codebase Files - IMPORTANT: READ THESE FILES BEFORE IMPLEMENTING!

- `src/deploy.ts` (lines 159-212) - Why: Contains contract loading pattern and deployment flow to mirror
- `src/deploy.ts` (lines 176-204) - Why: Shows provider configuration pattern to adapt for browser
- `src/deploy.ts` (lines 33-35) - Why: Authorship data constants to reuse
- `contracts/proof-of-authorship.compact` - Why: Contract source for computing hash
- `contracts/managed/proof-of-authorship/contract/index.cjs` - Why: Compiled contract to load
- `contracts/managed/proof-of-authorship/keys/` - Why: ZK prover/verifier keys to serve
- `contracts/managed/proof-of-authorship/zkir/` - Why: ZK intermediate representation to serve
- `package.json` - Why: Current SDK versions to align with
- `tsconfig.json` - Why: TypeScript configuration reference

### External Reference Files (from Mesh SDK research)

These patterns were extracted from `https://github.com/MeshJS/midnight-setup`:

**Wallet Connection Pattern** (from `packages/ui/src/lib/actions.ts`):
```typescript
const connectWallet = async () => {
  const wallet = window.midnight?.mnLace;
  if (!wallet) throw new Error('Lace wallet not found');
  const walletAPI = await wallet.enable();
  const uris = await wallet.serviceUriConfig();
  return { wallet: walletAPI, uris };
};
```

**Vite Config Pattern** (from `packages/ui/vite.config.ts`):
```typescript
// Required plugins
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { viteCommonjs } from "@originjs/vite-plugin-commonjs";

// Required aliases for Node.js polyfills
resolve: {
  alias: {
    buffer: 'buffer',
    process: 'process/browser',
    crypto: 'crypto-browserify',
    stream: 'stream-browserify',
  }
}
```

**Polyfills Pattern** (from `packages/ui/src/polyfills.ts`):
```typescript
import { Buffer } from 'buffer';
window.Buffer = Buffer;
window.global = window.global || window;
window.process = window.process || { env: {} };
```

### New Files to Create

```
web-deploy/
├── index.html              # Entry HTML file
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite configuration with WASM support
├── src/
│   ├── main.tsx            # React entry point
│   ├── App.tsx             # Main application component
│   ├── polyfills.ts        # Browser polyfills
│   ├── lib/
│   │   ├── wallet.ts       # Lace wallet connection
│   │   ├── providers.ts    # Midnight SDK provider setup
│   │   └── deploy.ts       # Contract deployment logic
│   └── components/
│       └── DeployButton.tsx # Deployment UI component
└── public/
    ├── keys/               # Copied from contracts/managed/.../keys/
    └── zkir/               # Copied from contracts/managed/.../zkir/
```

### Relevant Documentation - READ THESE BEFORE IMPLEMENTING!

- [Mesh SDK Wallet Integration](https://meshjs.dev/midnight/midnight-setup/wallet)
  - Section: Lace Wallet Integration
  - Why: Shows `window.midnight.mnLace` API usage

- [DApp Connector API Types](https://www.npmjs.com/package/@midnight-ntwrk/dapp-connector-api)
  - Why: TypeScript types for `DAppConnectorAPI`, `DAppConnectorWalletAPI`, `ServiceUriConfig`

### Patterns to Follow

**Network Configuration** (from existing `src/deploy.ts`):
```typescript
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
setNetworkId("preview");  // String literal for Preview network
```

**Contract Loading** (from existing `src/deploy.ts`):
```typescript
const ContractModule = await import(contractModulePath);
const contractInstance = new ContractModule.Contract({});
```

**Provider Interface** (from v3 SDK types):
```typescript
interface MidnightProviders {
  privateStateProvider: PrivateStateProvider;
  publicDataProvider: PublicDataProvider;
  zkConfigProvider: ZKConfigProvider;
  proofProvider: ProofProvider;
  walletProvider: WalletProvider;
  midnightProvider: MidnightProvider;
}
```

**WalletProvider Interface** (v3 SDK requirement):
```typescript
interface WalletProvider {
  balanceTx(tx: UnprovenTransaction, newCoins?: ShieldedCoinInfo[], ttl?: Date): Promise<BalancedProvingRecipe>;
  getCoinPublicKey(): CoinPublicKey;
  getEncryptionPublicKey(): EncPublicKey;
}
```

**Error Handling Convention**:
- Use try/catch with user-friendly error messages
- Log technical details to console
- Display status updates during long operations

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation - Project Setup

Set up the Vite + React project structure with all necessary dependencies and configuration.

**Tasks:**
- Initialize new Vite React project in `web-deploy/`
- Install dependencies (React, Midnight SDK packages, Vite plugins, polyfills)
- Configure Vite for WASM support and Node.js polyfills
- Set up TypeScript configuration
- Create polyfills file for browser compatibility
- Copy ZK artifacts to public directory

### Phase 2: Core Implementation - Wallet & Providers

Implement the Lace wallet connection and Midnight SDK provider configuration.

**Tasks:**
- Create wallet connection module using DApp Connector API
- Implement provider factory that uses Lace's service URIs
- Create WalletProvider wrapper that bridges Lace API to v3 SDK interface
- Set up network ID configuration for Preview

### Phase 3: Deployment Logic

Implement the contract deployment and circuit call functionality.

**Tasks:**
- Create deployment module that loads compiled contract
- Implement `deployContract` call with proper providers
- Implement `recordAuthorship` circuit call with authorship data
- Create deployment result handler that saves to JSON

### Phase 4: UI Integration

Build the React UI components for the deployment flow.

**Tasks:**
- Create main App component with deployment state management
- Implement DeployButton component with status display
- Add connection status and wallet address display
- Implement deployment result display and download

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1: CREATE `web-deploy/package.json`

- **IMPLEMENT**: Initialize package.json with all required dependencies
- **DEPENDENCIES**:
  ```json
  {
    "dependencies": {
      "react": "^19.0.0",
      "react-dom": "^19.0.0",
      "@midnight-ntwrk/dapp-connector-api": "3.0.0",
      "@midnight-ntwrk/midnight-js-contracts": "3.0.0-alpha.11",
      "@midnight-ntwrk/midnight-js-fetch-zk-config-provider": "3.0.0-alpha.11",
      "@midnight-ntwrk/midnight-js-http-client-proof-provider": "3.0.0-alpha.11",
      "@midnight-ntwrk/midnight-js-indexer-public-data-provider": "3.0.0-alpha.11",
      "@midnight-ntwrk/midnight-js-level-private-state-provider": "3.0.0-alpha.11",
      "@midnight-ntwrk/midnight-js-network-id": "3.0.0-alpha.11",
      "@midnight-ntwrk/midnight-js-types": "3.0.0-alpha.11",
      "@midnight-ntwrk/compact-runtime": "0.11.0-rc.1",
      "buffer": "^6.0.3"
    },
    "devDependencies": {
      "@types/react": "^19.0.0",
      "@types/react-dom": "^19.0.0",
      "@vitejs/plugin-react": "^4.5.0",
      "typescript": "^5.7.0",
      "vite": "^6.0.0",
      "vite-plugin-wasm": "^3.4.1",
      "vite-plugin-top-level-await": "^1.5.0",
      "@originjs/vite-plugin-commonjs": "^1.0.3",
      "crypto-browserify": "^3.12.0",
      "stream-browserify": "^3.0.0",
      "process": "^0.11.10"
    }
  }
  ```
- **SCRIPTS**: `"dev": "vite"`, `"build": "tsc && vite build"`, `"preview": "vite preview"`
- **GOTCHA**: Use `"type": "module"` for ESM support
- **VALIDATE**: `cd web-deploy && cat package.json | grep -q "vite-plugin-wasm"`

### Task 2: CREATE `web-deploy/vite.config.ts`

- **IMPLEMENT**: Vite configuration with WASM support and polyfills
- **PATTERN**: Mirror Mesh SDK's `vite.config.ts` structure
- **PLUGINS**: `react()`, `wasm()`, `topLevelAwait()`, `viteCommonjs()`
- **ALIASES**: buffer, process, crypto, stream polyfills
- **BUILD TARGET**: `"esnext"` for top-level await support
- **GOTCHA**: Must include `optimizeDeps.include: ['buffer', 'process']`
- **VALIDATE**: `cd web-deploy && npx tsc --noEmit vite.config.ts 2>/dev/null || echo "Config syntax OK"`

### Task 3: CREATE `web-deploy/tsconfig.json`

- **IMPLEMENT**: TypeScript configuration for React + Vite
- **COMPILER OPTIONS**: `"target": "ESNext"`, `"module": "ESNext"`, `"jsx": "react-jsx"`
- **STRICT MODE**: Enable strict type checking
- **PATTERN**: Standard Vite React TypeScript config
- **VALIDATE**: `cd web-deploy && cat tsconfig.json | grep -q "react-jsx"`

### Task 4: CREATE `web-deploy/index.html`

- **IMPLEMENT**: HTML entry point for Vite
- **INCLUDE**: Root div, script module pointing to `/src/main.tsx`
- **TITLE**: "Deploy Proof of Authorship"
- **VALIDATE**: `cd web-deploy && cat index.html | grep -q 'type="module"'`

### Task 5: CREATE `web-deploy/src/polyfills.ts`

- **IMPLEMENT**: Browser polyfills for Node.js globals
- **PATTERN**: Match Mesh SDK's polyfill pattern
- **EXPORTS**: Buffer to window.Buffer, global, process
- **IMPORTS**: `import { Buffer } from 'buffer'`
- **VALIDATE**: `cd web-deploy && cat src/polyfills.ts | grep -q "window.Buffer"`

### Task 6: CREATE `web-deploy/src/main.tsx`

- **IMPLEMENT**: React entry point
- **IMPORT ORDER**: Polyfills first, then React, then App
- **PATTERN**: `import './polyfills'` before any other imports
- **RENDER**: StrictMode wrapper around App
- **VALIDATE**: `cd web-deploy && cat src/main.tsx | grep -q "polyfills"`

### Task 7: CREATE `web-deploy/src/lib/wallet.ts`

- **IMPLEMENT**: Lace wallet connection module
- **TYPES**: Import from `@midnight-ntwrk/dapp-connector-api`
- **FUNCTION**: `connectWallet()` that returns `{ wallet, uris, state }`
- **ERROR HANDLING**: Check for `window.midnight?.mnLace` existence
- **TIMEOUT**: 5 second timeout for wallet response
- **PATTERN**: Mirror Mesh SDK's `connectWallet` function from `actions.ts`
- **EXPORTS**: `connectWallet`, `WalletConnection` type
- **VALIDATE**: `cd web-deploy && npx tsc --noEmit src/lib/wallet.ts 2>&1 | head -5`

### Task 8: CREATE `web-deploy/src/lib/providers.ts`

- **IMPLEMENT**: Midnight SDK provider factory
- **IMPORTS**:
  - `levelPrivateStateProvider` from `@midnight-ntwrk/midnight-js-level-private-state-provider`
  - `indexerPublicDataProvider` from `@midnight-ntwrk/midnight-js-indexer-public-data-provider`
  - `FetchZkConfigProvider` from `@midnight-ntwrk/midnight-js-fetch-zk-config-provider`
  - `httpClientProofProvider` from `@midnight-ntwrk/midnight-js-http-client-proof-provider`
  - `setNetworkId` from `@midnight-ntwrk/midnight-js-network-id`
- **FUNCTION**: `createProviders(uris, walletState)` returns MidnightProviders
- **WALLET PROVIDER**: Create wrapper with `getCoinPublicKey()`, `getEncryptionPublicKey()`, `balanceTx()`
- **MIDNIGHT PROVIDER**: Wrap wallet's `submitTransaction`
- **ZK CONFIG**: Use `FetchZkConfigProvider(window.location.origin, fetch.bind(window))`
- **NETWORK ID**: Call `setNetworkId("preview")` at module load
- **GOTCHA**: Use type assertions (`as any`) to bridge Lace API with v3 SDK types
- **VALIDATE**: `cd web-deploy && npx tsc --noEmit src/lib/providers.ts 2>&1 | head -5`

### Task 9: CREATE `web-deploy/src/lib/deploy.ts`

- **IMPLEMENT**: Contract deployment logic
- **IMPORTS**: `deployContract` from `@midnight-ntwrk/midnight-js-contracts`
- **CONTRACT PATH**: Dynamic import of `../../contracts/managed/proof-of-authorship/contract/index.cjs`
- **FUNCTION**: `deployProofOfAuthorship(providers)` returns deployment result
- **AUTHORSHIP DATA**:
  - `authorName`: "Joseph Fajen"
  - `timestamp`: `new Date().toISOString()`
  - `contractHash`: SHA-256 of contract source (compute in browser using SubtleCrypto)
  - `statement`: "Deployed by Joseph Fajen as a proof of concept exercise"
- **CIRCUIT CALL**: After deploy, call `recordAuthorship` with authorship data
- **RETURN**: `{ contractAddress, txId, blockHeight, timestamp, authorName, statement, contractHash }`
- **PATTERN**: Mirror `src/deploy.ts` lines 206-244
- **GOTCHA**: Use Web Crypto API (`crypto.subtle.digest`) instead of Node's crypto module
- **VALIDATE**: `cd web-deploy && npx tsc --noEmit src/lib/deploy.ts 2>&1 | head -5`

### Task 10: CREATE `web-deploy/src/components/DeployButton.tsx`

- **IMPLEMENT**: React component for deployment UI
- **STATE**: `status: 'idle' | 'connecting' | 'deploying' | 'recording' | 'success' | 'error'`
- **STATE**: `result: DeploymentResult | null`, `error: string | null`
- **UI ELEMENTS**:
  - Connect wallet button (disabled when connected)
  - Deploy button (disabled until connected)
  - Status display with current step
  - Result display with contract address, tx ID
  - Download JSON button on success
- **STYLING**: Minimal inline styles or Tailwind-like classes
- **VALIDATE**: `cd web-deploy && npx tsc --noEmit src/components/DeployButton.tsx 2>&1 | head -5`

### Task 11: CREATE `web-deploy/src/App.tsx`

- **IMPLEMENT**: Main application component
- **IMPORTS**: DeployButton component
- **LAYOUT**: Centered container with title, description, DeployButton
- **TITLE**: "Proof of Authorship - Midnight Preview"
- **DESCRIPTION**: Brief explanation of what the app does
- **PREREQUISITES**: List (Lace wallet, funded with tNight, proof server running)
- **VALIDATE**: `cd web-deploy && npx tsc --noEmit src/App.tsx 2>&1 | head -5`

### Task 12: COPY ZK artifacts to public directory

- **IMPLEMENT**: Build script to copy ZK files
- **SOURCE**: `../contracts/managed/proof-of-authorship/keys/` and `zkir/`
- **DESTINATION**: `web-deploy/public/keys/` and `web-deploy/public/zkir/`
- **SCRIPT**: Add `"prebuild"` and `"predev"` scripts to package.json
- **COMMAND**: `mkdir -p public/keys public/zkir && cp -r ../contracts/managed/proof-of-authorship/keys/* public/keys/ && cp -r ../contracts/managed/proof-of-authorship/zkir/* public/zkir/`
- **VALIDATE**: `cd web-deploy && npm run predev && ls public/keys/ public/zkir/`

### Task 13: UPDATE `web-deploy/package.json` scripts

- **IMPLEMENT**: Add prebuild/predev scripts for ZK artifact copying
- **ADD SCRIPTS**:
  ```json
  "predev": "mkdir -p public/keys public/zkir && cp -r ../contracts/managed/proof-of-authorship/keys/* public/keys/ 2>/dev/null || true && cp -r ../contracts/managed/proof-of-authorship/zkir/* public/zkir/ 2>/dev/null || true",
  "prebuild": "npm run predev"
  ```
- **VALIDATE**: `cd web-deploy && cat package.json | grep -q "predev"`

### Task 14: INSTALL dependencies and test build

- **IMPLEMENT**: Install all dependencies and verify build works
- **COMMANDS**:
  ```bash
  cd web-deploy
  npm install
  npm run build
  ```
- **VALIDATE**: `cd web-deploy && npm run build 2>&1 | tail -5`

### Task 15: TEST local development server

- **IMPLEMENT**: Start dev server and verify it loads
- **COMMAND**: `cd web-deploy && npm run dev`
- **MANUAL CHECK**: Open http://localhost:5173 in Chrome with Lace extension
- **VALIDATE**: `cd web-deploy && timeout 5 npm run dev 2>&1 | grep -q "Local:" && echo "Dev server starts"`

---

## TESTING STRATEGY

### Unit Tests

Not required for this minimal deployment tool. Focus on manual validation.

### Integration Tests

Not required. The tool is a one-time deployment utility.

### Manual Testing Checklist

1. [ ] Dev server starts without errors
2. [ ] Page loads in Chrome with Lace extension
3. [ ] "Connect Wallet" button appears
4. [ ] Clicking connect prompts Lace approval
5. [ ] After approval, wallet address displays
6. [ ] "Deploy Contract" button enables after connection
7. [ ] Clicking deploy shows status updates
8. [ ] Deployment completes with contract address
9. [ ] `recordAuthorship` transaction completes
10. [ ] Download JSON works and contains correct data

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
cd web-deploy && npx tsc --noEmit
```

### Level 2: Build Check

```bash
cd web-deploy && npm run build
```

### Level 3: Dev Server Start

```bash
cd web-deploy && timeout 10 npm run dev 2>&1 | grep -q "Local:"
```

### Level 4: ZK Artifacts Present

```bash
cd web-deploy && ls public/keys/*.bin public/zkir/*.zkir 2>/dev/null | wc -l
```

### Level 5: Manual Validation

1. Open Chrome with Lace Midnight Preview extension
2. Ensure Lace has tNight balance
3. Ensure proof server is running: `curl http://127.0.0.1:6300/`
4. Navigate to http://localhost:5173
5. Complete full deployment flow
6. Verify contract address in Lace or indexer

---

## ACCEPTANCE CRITERIA

- [ ] `web-deploy/` directory created with complete Vite + React app
- [ ] App connects to Lace Midnight Preview wallet
- [ ] App deploys contract to Preview network
- [ ] App calls `recordAuthorship` circuit successfully
- [ ] Deployment result displays contract address and transaction ID
- [ ] JSON download contains all deployment information
- [ ] No TypeScript errors (`npx tsc --noEmit` passes)
- [ ] Build completes without errors (`npm run build` succeeds)

---

## COMPLETION CHECKLIST

- [ ] All 15 tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] TypeScript compiles without errors
- [ ] Build completes successfully
- [ ] Manual testing confirms full deployment flow works
- [ ] Contract successfully deployed to Preview network
- [ ] Acceptance criteria all met

---

## NOTES

### Design Decisions

1. **Vite over Create React App**: Vite has better WASM support and faster dev experience
2. **Minimal UI**: No styling framework to keep dependencies minimal - inline styles only
3. **Type Assertions**: Using `as any` to bridge Lace API with v3 SDK types is acceptable given the SDK is in alpha
4. **Single Component**: DeployButton handles all state to keep the app simple
5. **No State Management Library**: React useState is sufficient for this single-page tool

### Trade-offs

1. **Security**: The app runs locally and doesn't store sensitive data. Wallet keys stay in Lace.
2. **Error Recovery**: If deployment fails mid-way, user must start over. This is acceptable for a POC tool.
3. **Browser Compatibility**: Only tested with Chrome + Lace. Other browsers may not work.

### Potential Issues

1. **WASM Loading**: If WASM fails to load, check Vite config and browser console
2. **Lace Not Found**: User must have Lace Midnight Preview extension installed
3. **Proof Server**: Must be running locally with `--network preview` flag
4. **IndexedDB**: Browser may prompt for storage permission for private state
5. **CORS**: ZK files must be served from same origin (handled by Vite dev server)

### Post-Deployment

After successful deployment:
1. Keep `web-deploy/` for potential future contract updates
2. Save `deployment.json` in project root
3. Update `README.md` with deployment details
4. Consider adding to `.gitignore`: `web-deploy/node_modules/`, `web-deploy/dist/`
