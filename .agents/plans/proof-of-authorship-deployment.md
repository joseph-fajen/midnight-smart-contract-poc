# Feature: Proof of Authorship Smart Contract Deployment

The following plan should be complete, but validate documentation and codebase patterns before implementing.

Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Deploy a "Proof of Authorship" smart contract to Midnight testnet that permanently records authorship information on the blockchain. The contract stores four public fields: author name, timestamp, contract source hash, and a statement. This serves as a portfolio piece demonstrating the ability to write, compile, and deploy a Midnight smart contract using zero-knowledge proof technology.

## User Story

As a technical professional building a portfolio
I want to deploy a Proof of Authorship smart contract to Midnight testnet
So that I can demonstrate hands-on blockchain development capability with ZK technology

## Problem Statement

Technical writers and professionals need tangible proof of hands-on technical capability. A deployed smart contract on a modern ZK blockchain provides verifiable evidence of understanding blockchain concepts, DSL proficiency, and deployment pipeline expertise.

## Solution Statement

Create a minimal but complete Midnight project with:
1. A Compact smart contract that stores authorship data publicly
2. A TypeScript deployment script that compiles, deploys, and verifies the contract
3. Documentation of the deployment process and verification methods

---

## CONTEXT REFERENCES

### Relevant Documentation - READ THESE BEFORE IMPLEMENTING!

- `/Users/josephfajen/git/midnight-docs/docs/getting-started/create-mn-app.mdx`
  - Manual project setup steps (lines 44-85)
  - Compact pragma and ledger syntax (lines 87-131)
  - Circuit definition with disclose() (lines 133-171)
  - Compile command (lines 173-204)

- `/Users/josephfajen/git/midnight-docs/docs/getting-started/deploy-mn-app.mdx`
  - Complete package.json with all dependencies (lines 31-62)
  - tsconfig.json configuration (lines 84-98)
  - Full deployment script with imports (lines 117-139)
  - Network configuration (lines 146-160)
  - Wallet building and funding (lines 229-257)
  - Contract loading (lines 264-283)
  - Provider configuration (lines 326-342)
  - Deploy and save (lines 350-376)

- `/Users/josephfajen/git/midnight-docs/docs/develop/reference/compact/lang-ref.mdx`
  - Opaque<"string"> type for variable-length strings (lines 729-742)
  - Bytes<n> for fixed-size byte arrays
  - Ledger operations and syntax

- `/Users/josephfajen/git/midnight-docs/docs/develop/reference/compact/explicit_disclosure.mdx`
  - How disclose() works and when it's required

### Example Repository Reference

- `https://github.com/midnightntwrk/example-counter`
  - `contract/src/counter.compact` - Simple contract pattern
  - `contract/src/index.ts` - How to export compiled contract
  - `contract/src/witnesses.ts` - Empty witnesses for public-only contracts
  - `counter-cli/src/api.ts` - Wallet and provider setup patterns
  - `counter-cli/src/config.ts` - TestnetRemoteConfig class pattern

### New Files to Create

```
midnight-smart-contract-poc/
├── contracts/
│   └── proof-of-authorship.compact      # Smart contract source
├── src/
│   └── deploy.ts                        # Deployment script
├── package.json                         # Dependencies and scripts
├── tsconfig.json                        # TypeScript configuration
└── .gitignore                           # Ignore node_modules, dist, etc.
```

### Patterns to Follow

**Compact Contract Pattern (from hello-world):**
```compact
pragma language_version 0.17;

export ledger fieldName: Opaque<"string">;

export circuit circuitName(param: Opaque<"string">): [] {
  fieldName = disclose(param);
}
```

**TypeScript Import Pattern (from deploy-mn-app.mdx):**
```typescript
import { WalletBuilder } from "@midnight-ntwrk/wallet";
import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { NetworkId, setNetworkId, getZswapNetworkId, getLedgerNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { createBalancedTx } from "@midnight-ntwrk/midnight-js-types";
import { nativeToken, Transaction } from "@midnight-ntwrk/ledger";
import { Transaction as ZswapTransaction } from "@midnight-ntwrk/zswap";
```

**Testnet Configuration (from CLAUDE.md):**
```typescript
const TESTNET_CONFIG = {
  indexer: "https://indexer.testnet-02.midnight.network/api/v1/graphql",
  indexerWS: "wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws",
  node: "https://rpc.testnet-02.midnight.network",
  proofServer: "http://127.0.0.1:6300"
};
```

**Provider Configuration Pattern:**
```typescript
const providers = {
  privateStateProvider: levelPrivateStateProvider({ privateStateStoreName: "state-name" }),
  publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
  zkConfigProvider: new NodeZkConfigProvider(zkConfigPath),
  proofProvider: httpClientProofProvider(config.proofServer),
  walletProvider: walletProvider,
  midnightProvider: walletProvider
};
```

---

## IMPLEMENTATION PLAN

### Phase 1: Project Setup

Create the project structure with all necessary configuration files and dependencies.

**Tasks:**
- Create directory structure (contracts/, src/)
- Create package.json with Midnight SDK dependencies
- Create tsconfig.json for ES module compilation
- Create .gitignore for Node.js project
- Install dependencies

### Phase 2: Smart Contract Development

Write the Proof of Authorship contract in Compact language.

**Tasks:**
- Create proof-of-authorship.compact with ledger declarations
- Define recordAuthorship circuit with disclose()
- Compile contract to generate artifacts

### Phase 3: Deployment Script

Create TypeScript deployment script that:
- Builds or restores a wallet
- Waits for funding if needed
- Loads compiled contract
- Configures providers
- Deploys contract
- Calls recordAuthorship with authorship data
- Saves deployment info

**Tasks:**
- Create deploy.ts with all imports
- Implement wallet setup with seed handling
- Implement provider configuration
- Implement contract deployment
- Implement circuit call for recordAuthorship
- Save deployment.json with contract address

### Phase 4: Testing & Verification

Verify the deployment works end-to-end.

**Tasks:**
- Compile contract successfully
- Build TypeScript successfully
- Deploy to testnet (requires manual proof-server and faucet)
- Verify contract state via indexer

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE package.json

- **IMPLEMENT**: Create package.json with type "module", scripts for compile/build/deploy, and all @midnight-ntwrk dependencies
- **PATTERN**: Reference `/Users/josephfajen/git/midnight-docs/docs/getting-started/deploy-mn-app.mdx` lines 31-62
- **IMPORTS**: Use dependency versions from example-counter for latest compatibility
- **GOTCHA**: Must use `"type": "module"` for ES modules
- **GOTCHA**: The compact-runtime version should be `^0.9.0` (latest from example-counter)

```json
{
  "name": "proof-of-authorship",
  "version": "1.0.0",
  "description": "Proof of Authorship smart contract for Midnight testnet",
  "type": "module",
  "scripts": {
    "compile": "compact compile contracts/proof-of-authorship.compact contracts/managed/proof-of-authorship",
    "build": "tsc",
    "deploy": "node dist/deploy.js"
  },
  "dependencies": {
    "@midnight-ntwrk/compact-runtime": "^0.9.0",
    "@midnight-ntwrk/ledger": "^4.0.0",
    "@midnight-ntwrk/midnight-js-contracts": "2.0.2",
    "@midnight-ntwrk/midnight-js-http-client-proof-provider": "2.0.2",
    "@midnight-ntwrk/midnight-js-indexer-public-data-provider": "2.0.2",
    "@midnight-ntwrk/midnight-js-level-private-state-provider": "2.0.2",
    "@midnight-ntwrk/midnight-js-node-zk-config-provider": "2.0.2",
    "@midnight-ntwrk/midnight-js-network-id": "2.0.2",
    "@midnight-ntwrk/midnight-js-types": "2.0.2",
    "@midnight-ntwrk/midnight-js-utils": "2.0.2",
    "@midnight-ntwrk/wallet": "5.0.0",
    "@midnight-ntwrk/wallet-api": "5.0.0",
    "@midnight-ntwrk/zswap": "^4.0.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/ws": "^8.5.10",
    "typescript": "^5.7.0"
  }
}
```

- **VALIDATE**: `cat package.json | head -20`

### CREATE tsconfig.json

- **IMPLEMENT**: TypeScript configuration for ES2022 target with ESNext modules
- **PATTERN**: Reference `/Users/josephfajen/git/midnight-docs/docs/getting-started/deploy-mn-app.mdx` lines 84-98
- **GOTCHA**: Must use `"moduleResolution": "node"` for @midnight-ntwrk packages
- **GOTCHA**: Add `"allowJs": true` to import .cjs contract files

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowJs": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"]
}
```

- **VALIDATE**: `cat tsconfig.json`

### CREATE .gitignore

- **IMPLEMENT**: Standard Node.js gitignore plus Midnight-specific entries

```
# Dependencies
node_modules/

# Build output
dist/

# Compiled contract artifacts (can be regenerated)
contracts/managed/

# Runtime data
*.log
.DS_Store

# Private state storage
*-private-state/

# Sensitive files
.env
*.seed
```

- **VALIDATE**: `cat .gitignore`

### CREATE contracts/ directory

- **IMPLEMENT**: Create contracts directory for Compact source files
- **VALIDATE**: `ls -la contracts/`

### CREATE contracts/proof-of-authorship.compact

- **IMPLEMENT**: Compact smart contract with 4 public ledger fields and recordAuthorship circuit
- **PATTERN**: Reference `/Users/josephfajen/git/midnight-docs/docs/getting-started/create-mn-app.mdx` lines 163-171
- **PATTERN**: Use `Opaque<"string">` for variable-length strings (author, timestamp, statement)
- **PATTERN**: Use `Bytes<32>` for SHA-256 hash (contractHash)
- **GOTCHA**: All parameters must be wrapped in `disclose()` when writing to public ledger
- **GOTCHA**: Pragma must specify language version 0.17 for compatibility

```compact
pragma language_version 0.17;

// Proof of Authorship Contract
// Stores authorship information permanently on the Midnight blockchain

// Public ledger state - all fields are publicly visible
export ledger authorName: Opaque<"string">;
export ledger timestamp: Opaque<"string">;
export ledger contractHash: Bytes<32>;
export ledger statement: Opaque<"string">;

// Circuit to record authorship data
// All inputs are explicitly disclosed to the public ledger
export circuit recordAuthorship(
  author: Opaque<"string">,
  time: Opaque<"string">,
  hash: Bytes<32>,
  msg: Opaque<"string">
): [] {
  authorName = disclose(author);
  timestamp = disclose(time);
  contractHash = disclose(hash);
  statement = disclose(msg);
}
```

- **VALIDATE**: `cat contracts/proof-of-authorship.compact`

### CREATE src/ directory

- **IMPLEMENT**: Create src directory for TypeScript source files
- **VALIDATE**: `ls -la src/`

### CREATE src/deploy.ts

- **IMPLEMENT**: Complete deployment script following deploy-mn-app.mdx pattern
- **PATTERN**: Reference `/Users/josephfajen/git/midnight-docs/docs/getting-started/deploy-mn-app.mdx` (full file)
- **PATTERN**: Reference `https://github.com/midnightntwrk/example-counter` counter-cli/src/api.ts for wallet provider
- **IMPORTS**: All @midnight-ntwrk packages plus ws, fs, path, crypto, readline
- **GOTCHA**: Must set `globalThis.WebSocket = WebSocket` for Node.js environment
- **GOTCHA**: Must call `setNetworkId(NetworkId.TestNet)` before wallet operations
- **GOTCHA**: Contract module import uses dynamic import of .cjs file
- **GOTCHA**: After deployment, must call `recordAuthorship` circuit to store data
- **GOTCHA**: SHA-256 hash must be computed from contract source and converted to Uint8Array

The deployment script should:
1. Generate or accept a wallet seed
2. Build wallet and wait for funds
3. Load compiled contract
4. Configure all providers
5. Deploy contract
6. Call recordAuthorship with: "Joseph Fajen", current ISO timestamp, SHA-256 of contract source, statement
7. Save deployment.json with contract address and metadata

```typescript
import { WalletBuilder } from "@midnight-ntwrk/wallet";
import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import {
  NetworkId,
  setNetworkId,
  getZswapNetworkId,
  getLedgerNetworkId,
} from "@midnight-ntwrk/midnight-js-network-id";
import { createBalancedTx } from "@midnight-ntwrk/midnight-js-types";
import { nativeToken, Transaction } from "@midnight-ntwrk/ledger";
import { Transaction as ZswapTransaction } from "@midnight-ntwrk/zswap";
import { WebSocket } from "ws";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as readline from "readline/promises";
import * as Rx from "rxjs";
import { type Wallet } from "@midnight-ntwrk/wallet-api";

// Fix WebSocket for Node.js environment
// @ts-ignore
globalThis.WebSocket = WebSocket;

// Configure for Midnight Testnet
setNetworkId(NetworkId.TestNet);

// Testnet connection endpoints
const TESTNET_CONFIG = {
  indexer: "https://indexer.testnet-02.midnight.network/api/v1/graphql",
  indexerWS: "wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws",
  node: "https://rpc.testnet-02.midnight.network",
  proofServer: "http://127.0.0.1:6300",
};

// Authorship data
const AUTHOR_NAME = "Joseph Fajen";
const STATEMENT = "Deployed by Joseph Fajen as a proof of concept exercise";

// Helper to wait for wallet funding
const waitForFunds = (wallet: Wallet) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.tap((state) => {
        if (state.syncProgress) {
          console.log(
            `Sync: synced=${state.syncProgress.synced}, sourceGap=${state.syncProgress.lag.sourceGap}, applyGap=${state.syncProgress.lag.applyGap}`
          );
        }
      }),
      Rx.filter((state) => state.syncProgress?.synced === true),
      Rx.map((s) => s.balances[nativeToken()] ?? 0n),
      Rx.filter((balance) => balance > 0n),
      Rx.tap((balance) => console.log(`Wallet funded with balance: ${balance}`))
    )
  );

// Compute SHA-256 hash of contract source
function computeContractHash(contractPath: string): Uint8Array {
  const source = fs.readFileSync(contractPath, "utf-8");
  const hash = crypto.createHash("sha256").update(source).digest();
  return new Uint8Array(hash);
}

// Generate random wallet seed
function generateSeed(): string {
  const bytes = crypto.randomBytes(32);
  return bytes.toString("hex");
}

async function main() {
  console.log("===========================================");
  console.log("  Proof of Authorship - Midnight Testnet");
  console.log("===========================================\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // Check if contract is compiled
    const contractPath = path.join(process.cwd(), "contracts");
    const contractModulePath = path.join(
      contractPath,
      "managed",
      "proof-of-authorship",
      "contract",
      "index.cjs"
    );

    if (!fs.existsSync(contractModulePath)) {
      console.error("Contract not compiled! Run: npm run compile");
      process.exit(1);
    }

    // Get or generate wallet seed
    const choice = await rl.question("Do you have a wallet seed? (y/n): ");

    let walletSeed: string;
    if (choice.toLowerCase() === "y" || choice.toLowerCase() === "yes") {
      walletSeed = await rl.question("Enter your 64-character seed: ");
      walletSeed = walletSeed.trim();
    } else {
      walletSeed = generateSeed();
      console.log(`\n*** SAVE THIS SEED ***`);
      console.log(`${walletSeed}`);
      console.log(`**********************\n`);
    }

    // Build wallet
    console.log("Building wallet...");
    const wallet = await WalletBuilder.buildFromSeed(
      TESTNET_CONFIG.indexer,
      TESTNET_CONFIG.indexerWS,
      TESTNET_CONFIG.proofServer,
      TESTNET_CONFIG.node,
      walletSeed,
      getZswapNetworkId(),
      "warn"
    );

    wallet.start();
    console.log("Wallet started, syncing...");

    // Wait for initial sync
    await Rx.firstValueFrom(
      wallet.state().pipe(
        Rx.filter((state) => state.syncProgress !== undefined)
      )
    );

    const state = await Rx.firstValueFrom(wallet.state());
    console.log(`Wallet address: ${state.address}`);

    // Check balance
    let balance = state.balances[nativeToken()] || 0n;

    if (balance === 0n) {
      console.log("\nWallet balance: 0");
      console.log("Please fund your wallet:");
      console.log("1. Go to: https://midnight.network/test-faucet");
      console.log(`2. Enter address: ${state.address}`);
      console.log("3. Request tDUST tokens\n");
      console.log("Waiting for funds...");
      balance = await waitForFunds(wallet);
    }

    console.log(`Balance: ${balance} tDUST\n`);

    // Load compiled contract
    console.log("Loading contract...");
    const ContractModule = await import(contractModulePath);
    const contractInstance = new ContractModule.Contract({});

    // Create wallet provider
    const walletState = await Rx.firstValueFrom(wallet.state());

    const walletProvider = {
      coinPublicKey: walletState.coinPublicKey,
      encryptionPublicKey: walletState.encryptionPublicKey,
      balanceTx(tx: any, newCoins: any) {
        return wallet
          .balanceTransaction(
            ZswapTransaction.deserialize(
              tx.serialize(getLedgerNetworkId()),
              getZswapNetworkId()
            ),
            newCoins
          )
          .then((tx) => wallet.proveTransaction(tx))
          .then((zswapTx) =>
            Transaction.deserialize(
              zswapTx.serialize(getZswapNetworkId()),
              getLedgerNetworkId()
            )
          )
          .then(createBalancedTx);
      },
      submitTx(tx: any) {
        return wallet.submitTransaction(tx);
      },
    };

    // Configure providers
    console.log("Configuring providers...");
    const zkConfigPath = path.join(contractPath, "managed", "proof-of-authorship");
    const providers = {
      privateStateProvider: levelPrivateStateProvider({
        privateStateStoreName: "proof-of-authorship-state",
      }),
      publicDataProvider: indexerPublicDataProvider(
        TESTNET_CONFIG.indexer,
        TESTNET_CONFIG.indexerWS
      ),
      zkConfigProvider: new NodeZkConfigProvider(zkConfigPath),
      proofProvider: httpClientProofProvider(TESTNET_CONFIG.proofServer),
      walletProvider: walletProvider,
      midnightProvider: walletProvider,
    };

    // Deploy contract
    console.log("Deploying contract (this may take 30-60 seconds)...");
    const deployed = await deployContract(providers, {
      contract: contractInstance,
      privateStateId: "proofOfAuthorshipState",
      initialPrivateState: {},
    });

    const contractAddress = deployed.deployTxData.public.contractAddress;
    console.log(`\nContract deployed at: ${contractAddress}`);

    // Prepare authorship data
    const timestamp = new Date().toISOString();
    const contractSourcePath = path.join(contractPath, "proof-of-authorship.compact");
    const contractHash = computeContractHash(contractSourcePath);

    console.log("\nRecording authorship data...");
    console.log(`  Author: ${AUTHOR_NAME}`);
    console.log(`  Timestamp: ${timestamp}`);
    console.log(`  Contract Hash: ${Buffer.from(contractHash).toString("hex")}`);
    console.log(`  Statement: ${STATEMENT}`);

    // Call recordAuthorship circuit
    console.log("\nCalling recordAuthorship circuit...");
    const txData = await deployed.callTx.recordAuthorship(
      AUTHOR_NAME,
      timestamp,
      contractHash,
      STATEMENT
    );

    console.log(`Transaction ID: ${txData.public.txId}`);
    console.log(`Block height: ${txData.public.blockHeight}`);

    // Save deployment info
    const deploymentInfo = {
      contractAddress,
      deployedAt: timestamp,
      txId: txData.public.txId,
      blockHeight: Number(txData.public.blockHeight),
      authorName: AUTHOR_NAME,
      statement: STATEMENT,
      contractHash: Buffer.from(contractHash).toString("hex"),
      walletAddress: state.address,
      network: "testnet-02",
    };

    fs.writeFileSync("deployment.json", JSON.stringify(deploymentInfo, null, 2));
    console.log("\nDeployment info saved to deployment.json");

    console.log("\n===========================================");
    console.log("  DEPLOYMENT SUCCESSFUL!");
    console.log("===========================================");
    console.log(`\nContract Address: ${contractAddress}`);
    console.log(`\nVerify at: https://indexer.testnet-02.midnight.network`);

    // Cleanup
    await wallet.close();
  } catch (error) {
    console.error("\nDeployment failed:", error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main().catch(console.error);
```

- **VALIDATE**: `cat src/deploy.ts | head -50`

### RUN npm install

- **IMPLEMENT**: Install all dependencies
- **GOTCHA**: May take a while due to native modules
- **VALIDATE**: `npm install && echo "Dependencies installed successfully"`

### RUN npm run compile

- **IMPLEMENT**: Compile Compact contract to generate artifacts
- **PREREQUISITE**: Compact compiler must be installed (`compact --version`)
- **GOTCHA**: If compact not found, install with: `curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/download/compact-v0.2.0/compact-installer.sh | sh`
- **VALIDATE**: `npm run compile && ls contracts/managed/proof-of-authorship/`

### RUN npm run build

- **IMPLEMENT**: Compile TypeScript to JavaScript
- **VALIDATE**: `npm run build && ls dist/`

---

## TESTING STRATEGY

### Prerequisites Check

Before deployment, verify:

```bash
# Check Node.js version (must be 20+)
node --version

# Check Compact compiler
compact --version

# Check Docker (for proof server)
docker --version
```

### Compilation Tests

```bash
# Compile contract - should create managed/ directory
npm run compile

# Verify artifacts exist
ls contracts/managed/proof-of-authorship/contract/index.cjs

# Build TypeScript
npm run build

# Verify dist/ exists
ls dist/deploy.js
```

### Manual Deployment Test

1. **Start proof server** (in separate terminal):
   ```bash
   docker run -p 6300:6300 midnightnetwork/proof-server -- 'midnight-proof-server --network testnet'
   ```

2. **Run deployment**:
   ```bash
   npm run deploy
   ```

3. **Verify deployment.json** created with valid contract address

### Verification via Indexer

After deployment, verify contract state using GraphQL query:

```graphql
query {
  contractState(address: "<CONTRACT_ADDRESS>") {
    address
    data
  }
}
```

Use: https://indexer.testnet-02.midnight.network/api/v1/graphql

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Files

```bash
# Verify all files exist
ls -la package.json tsconfig.json .gitignore
ls -la contracts/proof-of-authorship.compact
ls -la src/deploy.ts
```

### Level 2: Dependencies

```bash
# Install dependencies (should succeed with no errors)
npm install
```

### Level 3: Compilation

```bash
# Compile Compact contract
npm run compile

# Verify contract artifacts
test -f contracts/managed/proof-of-authorship/contract/index.cjs && echo "Contract compiled successfully"
```

### Level 4: TypeScript Build

```bash
# Build TypeScript
npm run build

# Verify JavaScript output
test -f dist/deploy.js && echo "TypeScript compiled successfully"
```

### Level 5: Deployment (Manual - requires proof server and funding)

```bash
# In terminal 1: Start proof server
docker run -p 6300:6300 midnightnetwork/proof-server -- 'midnight-proof-server --network testnet'

# In terminal 2: Deploy
npm run deploy

# Verify deployment
test -f deployment.json && cat deployment.json
```

---

## ACCEPTANCE CRITERIA

- [ ] `package.json` exists with all @midnight-ntwrk dependencies
- [ ] `tsconfig.json` exists with ES2022/ESNext configuration
- [ ] `contracts/proof-of-authorship.compact` exists with valid Compact syntax
- [ ] `src/deploy.ts` exists with complete deployment logic
- [ ] `npm install` completes without errors
- [ ] `npm run compile` generates `contracts/managed/proof-of-authorship/`
- [ ] `npm run build` generates `dist/deploy.js`
- [ ] Contract compilation produces `index.cjs` in contract directory
- [ ] Deployment script handles wallet seed generation/recovery
- [ ] Deployment script waits for wallet funding
- [ ] After deployment, `deployment.json` contains valid contract address
- [ ] Authorship data is recorded on-chain via recordAuthorship circuit

---

## COMPLETION CHECKLIST

- [ ] All files created (package.json, tsconfig.json, .gitignore, contract, deploy.ts)
- [ ] `npm install` successful
- [ ] `npm run compile` successful
- [ ] `npm run build` successful
- [ ] Proof server can be started via Docker
- [ ] Deployment completes and creates deployment.json
- [ ] Contract address verifiable via indexer

---

## NOTES

### Design Decisions

1. **Manual setup over create-mn-app**: Provides more learning value and control for a simple single-contract project.

2. **Single package structure**: No need for workspace complexity with just one contract and one CLI script.

3. **SHA-256 hash in TypeScript**: Computed at deployment time using Node.js crypto module, then passed to the circuit as Bytes<32>.

4. **All data public**: Simplifies the contract by avoiding witness functions and private state complexity.

5. **Interactive wallet seed**: Allows reuse of existing funded wallet or generates new seed.

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Proof server not running | Clear error message directing user to start Docker |
| Wallet not funded | Script waits indefinitely with clear faucet instructions |
| Contract compilation fails | Verify Compact compiler installed and version compatible |
| Network issues | Testnet endpoints hardcoded; check Midnight status page if issues |

### External Dependencies

- **Midnight Testnet**: Must be operational
- **Proof Server**: Docker image `midnightnetwork/proof-server`
- **Faucet**: https://midnight.network/test-faucet for tDUST tokens
- **Compact Compiler**: v0.2.0 installed locally

### Post-Deployment Verification

After successful deployment, verify by:
1. Check `deployment.json` for contract address
2. Query indexer GraphQL endpoint for contract state
3. Verify all 4 fields (authorName, timestamp, contractHash, statement) are stored

### Estimated Confidence Score

**8/10** - High confidence due to:
- Clear patterns from official docs and example repos
- Simple contract with no complex ZK logic
- Well-documented deployment process

Minor risks:
- Version compatibility between packages (mitigated by using example-counter versions)
- Network/proof server availability (external dependency)
