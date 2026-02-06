# Feature: CLI Deployment with Ledger 7.0

## Overview

Upgrade CLI deployment to Ledger 7.0 SDK stack and deploy "Proof of Authorship" contract to Midnight Preview network.

**User Story**: As a developer new to Midnight, I want a working CLI deployment workflow using Ledger 7.0.

**Complexity**: Medium-High (SDK architecture completely changed)

---

## CRITICAL CONTEXT

### Version Matrix (Ledger 7.0)

| Component | Version |
|-----------|---------|
| Compact version manager | 0.4.0 |
| Compact compiler | 0.28.0 |
| Language pragma | >= 0.20 |
| compact-runtime | 0.14.0 |
| midnight-js-* | 3.0.0 |
| ledger-v7 | 7.0.0 |
| wallet-sdk-facade | 1.0.0 |
| wallet-sdk-hd | 3.0.0 |
| wallet-sdk-shielded | 1.0.0 |
| wallet-sdk-dust-wallet | 1.0.0 |
| wallet-sdk-unshielded-wallet | 1.0.0 |
| wallet-sdk-address-format | 3.0.0 |
| Proof Server Docker | 7.0.0 |

### Breaking Changes

| Old | New |
|-----|-----|
| `WalletBuilder.build()` | `WalletFacade` + 3 sub-wallets |
| `nativeToken()` from zswap | `unshieldedToken().raw` from ledger-v7 |
| `state.syncProgress?.synced` | `state.isSynced` |
| `state.balances[token]` | `state.unshielded.balances[token]` |
| `wallet.close()` | `wallet.stop()` |
| Proof server `--network preview` | Just `-v` (no network flag) |

### Required Workarounds

**signRecipe Bug**: wallet-sdk 1.0.0 has a bug - must implement manual signing:
```typescript
// Base transaction (proven): use 'proof'
signTransactionIntents(recipe.baseTransaction, signFn, 'proof');
// Balancing transaction: use 'pre-proof'
if (recipe.balancingTransaction) {
  signTransactionIntents(recipe.balancingTransaction, signFn, 'pre-proof');
}
```

**DUST Registration**: Before deployment, NIGHT UTXOs must be registered for dust generation (fee tokens).

### Reference Files — READ BEFORE IMPLEMENTING

- `https://github.com/midnightntwrk/example-counter/blob/main/counter-cli/src/api.ts` — Complete wallet patterns
- `https://github.com/midnightntwrk/example-counter/blob/main/MIGRATION_GUIDE.md` — Full migration docs

---

## STEP-BY-STEP TASKS

### Task 1: Install Compact 0.28.0

```bash
rm -rf ~/.compact && rm -f ~/.local/bin/compact
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/midnightntwrk/compact/releases/download/compact-v0.4.0/compact-installer.sh | sh
source $HOME/.local/bin/env
compact update 0.28.0
```

**Validate**: `compact --version` → `0.4.0`, `compact list` → `→ 0.28.0`

### Task 2: Update Contract Pragma

**File**: `contracts/proof-of-authorship.compact` line 1

```diff
- pragma language_version 0.18;
+ pragma language_version >= 0.20;
```

**Validate**: `head -1 contracts/proof-of-authorship.compact`

### Task 3: Update package.json

Replace entire dependencies section:

```json
{
  "name": "proof-of-authorship",
  "version": "1.0.0",
  "description": "Proof of Authorship smart contract for Midnight Preview network",
  "type": "module",
  "scripts": {
    "compile": "compact compile contracts/proof-of-authorship.compact contracts/managed/proof-of-authorship",
    "build": "tsc",
    "deploy": "node dist/deploy.js"
  },
  "dependencies": {
    "@midnight-ntwrk/compact-runtime": "0.14.0",
    "@midnight-ntwrk/compact-js": "0.2.0",
    "@midnight-ntwrk/ledger": "^4.0.0",
    "@midnight-ntwrk/ledger-v7": "7.0.0",
    "@midnight-ntwrk/midnight-js-contracts": "3.0.0",
    "@midnight-ntwrk/midnight-js-http-client-proof-provider": "3.0.0",
    "@midnight-ntwrk/midnight-js-indexer-public-data-provider": "3.0.0",
    "@midnight-ntwrk/midnight-js-level-private-state-provider": "3.0.0",
    "@midnight-ntwrk/midnight-js-network-id": "3.0.0",
    "@midnight-ntwrk/midnight-js-node-zk-config-provider": "3.0.0",
    "@midnight-ntwrk/midnight-js-types": "3.0.0",
    "@midnight-ntwrk/midnight-js-utils": "3.0.0",
    "@midnight-ntwrk/wallet-sdk-facade": "1.0.0",
    "@midnight-ntwrk/wallet-sdk-hd": "3.0.0",
    "@midnight-ntwrk/wallet-sdk-shielded": "1.0.0",
    "@midnight-ntwrk/wallet-sdk-dust-wallet": "1.0.0",
    "@midnight-ntwrk/wallet-sdk-unshielded-wallet": "1.0.0",
    "@midnight-ntwrk/wallet-sdk-address-format": "3.0.0",
    "pino": "^10.0.0",
    "pino-pretty": "^13.0.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/ws": "^8.5.10",
    "typescript": "^5.7.0"
  }
}
```

**Validate**: `rm -rf node_modules package-lock.json && npm install && npm ls @midnight-ntwrk/wallet-sdk-facade`

### Task 4: Compile Contract

```bash
npm run compile
```

**Validate**: `ls contracts/managed/proof-of-authorship/contract/index.cjs`

### Task 5: Rewrite src/deploy.ts

**CRITICAL**: This is a complete rewrite. The code below implements:
- HD wallet key derivation
- WalletFacade with 3 sub-wallets
- signRecipe bug workaround
- DUST registration flow
- Contract deployment

```typescript
import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { setNetworkId, getNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { toHex } from "@midnight-ntwrk/midnight-js-utils";
import * as ledger from "@midnight-ntwrk/ledger-v7";
import { unshieldedToken } from "@midnight-ntwrk/ledger-v7";
import { WalletFacade } from "@midnight-ntwrk/wallet-sdk-facade";
import { ShieldedWallet } from "@midnight-ntwrk/wallet-sdk-shielded";
import { DustWallet } from "@midnight-ntwrk/wallet-sdk-dust-wallet";
import { createKeystore, InMemoryTransactionHistoryStorage, PublicKey, UnshieldedWallet, type UnshieldedKeystore } from "@midnight-ntwrk/wallet-sdk-unshielded-wallet";
import { HDWallet, Roles, generateRandomSeed } from "@midnight-ntwrk/wallet-sdk-hd";
import { WebSocket } from "ws";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as readline from "readline/promises";
import * as Rx from "rxjs";
import { Buffer } from "buffer";

// @ts-expect-error: Required for GraphQL subscriptions in Node.js
globalThis.WebSocket = WebSocket;

setNetworkId("preview");

const CONFIG = {
  indexer: "https://indexer.preview.midnight.network/api/v3/graphql",
  indexerWS: "wss://indexer.preview.midnight.network/api/v3/graphql/ws",
  node: "https://rpc.preview.midnight.network",
  proofServer: "http://127.0.0.1:6300",
};

const AUTHOR_NAME = "Joseph Fajen";
const STATEMENT = "Deployed by Joseph Fajen as a proof of concept exercise";

interface WalletContext {
  wallet: WalletFacade;
  shieldedSecretKeys: ledger.ZswapSecretKeys;
  dustSecretKey: ledger.DustSecretKey;
  unshieldedKeystore: UnshieldedKeystore;
}

// === HD Wallet Key Derivation ===
function deriveKeysFromSeed(seed: string) {
  const hdWallet = HDWallet.fromSeed(Buffer.from(seed, "hex"));
  if (hdWallet.type !== "seedOk") throw new Error("Failed to initialize HDWallet");
  const result = hdWallet.hdWallet.selectAccount(0).selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust]).deriveKeysAt(0);
  if (result.type !== "keysDerived") throw new Error("Failed to derive keys");
  hdWallet.hdWallet.clear();
  return result.keys;
}

// === signRecipe Bug Workaround ===
function signTransactionIntents(
  tx: { intents?: Map<number, any> },
  signFn: (payload: Uint8Array) => ledger.Signature,
  proofMarker: "proof" | "pre-proof"
): void {
  if (!tx.intents || tx.intents.size === 0) return;
  for (const segment of tx.intents.keys()) {
    const intent = tx.intents.get(segment);
    if (!intent) continue;
    const cloned = ledger.Intent.deserialize<ledger.SignatureEnabled, ledger.Proofish, ledger.PreBinding>(
      "signature", proofMarker, "pre-binding", intent.serialize()
    );
    const sigData = cloned.signatureData(segment);
    const signature = signFn(sigData);
    if (cloned.fallibleUnshieldedOffer) {
      const sigs = cloned.fallibleUnshieldedOffer.inputs.map((_: any, i: number) => cloned.fallibleUnshieldedOffer!.signatures.at(i) ?? signature);
      cloned.fallibleUnshieldedOffer = cloned.fallibleUnshieldedOffer.addSignatures(sigs);
    }
    if (cloned.guaranteedUnshieldedOffer) {
      const sigs = cloned.guaranteedUnshieldedOffer.inputs.map((_: any, i: number) => cloned.guaranteedUnshieldedOffer!.signatures.at(i) ?? signature);
      cloned.guaranteedUnshieldedOffer = cloned.guaranteedUnshieldedOffer.addSignatures(sigs);
    }
    tx.intents.set(segment, cloned);
  }
}

// === Wallet/Midnight Provider Bridge ===
async function createProvider(ctx: WalletContext) {
  const state = await Rx.firstValueFrom(ctx.wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  return {
    getCoinPublicKey: () => state.shielded.coinPublicKey.toHexString(),
    getEncryptionPublicKey: () => state.shielded.encryptionPublicKey.toHexString(),
    async balanceTx(tx: any, ttl?: Date) {
      const recipe = await ctx.wallet.balanceUnboundTransaction(tx,
        { shieldedSecretKeys: ctx.shieldedSecretKeys, dustSecretKey: ctx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) }
      );
      const signFn = (payload: Uint8Array) => ctx.unshieldedKeystore.signData(payload);
      signTransactionIntents(recipe.baseTransaction, signFn, "proof");
      if (recipe.balancingTransaction) signTransactionIntents(recipe.balancingTransaction, signFn, "pre-proof");
      return ctx.wallet.finalizeRecipe(recipe);
    },
    submitTx: (tx: any) => ctx.wallet.submitTransaction(tx) as any,
  };
}

// === Wallet Building ===
async function buildWallet(seed: string): Promise<WalletContext> {
  const keys = deriveKeysFromSeed(seed);
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], getNetworkId());

  const networkId = getNetworkId();
  const shieldedWallet = ShieldedWallet({
    networkId, indexerClientConnection: { indexerHttpUrl: CONFIG.indexer, indexerWsUrl: CONFIG.indexerWS },
    provingServerUrl: new URL(CONFIG.proofServer), relayURL: new URL(CONFIG.node.replace(/^http/, "ws")),
  }).startWithSecretKeys(shieldedSecretKeys);

  const unshieldedWallet = UnshieldedWallet({
    networkId, indexerClientConnection: { indexerHttpUrl: CONFIG.indexer, indexerWsUrl: CONFIG.indexerWS },
    txHistoryStorage: new InMemoryTransactionHistoryStorage(),
  }).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore));

  const dustWallet = DustWallet({
    networkId, costParameters: { additionalFeeOverhead: 300_000_000_000_000n, feeBlocksMargin: 5 },
    indexerClientConnection: { indexerHttpUrl: CONFIG.indexer, indexerWsUrl: CONFIG.indexerWS },
    provingServerUrl: new URL(CONFIG.proofServer), relayURL: new URL(CONFIG.node.replace(/^http/, "ws")),
  }).startWithSecretKey(dustSecretKey, ledger.LedgerParameters.initialParameters().dust);

  const wallet = new WalletFacade(shieldedWallet, unshieldedWallet, dustWallet);
  await wallet.start(shieldedSecretKeys, dustSecretKey);
  return { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };
}

// === Utilities ===
const waitForSync = (w: WalletFacade) => Rx.firstValueFrom(w.state().pipe(Rx.filter((s) => s.isSynced)));
const waitForFunds = (w: WalletFacade) => Rx.firstValueFrom(w.state().pipe(
  Rx.filter((s) => s.isSynced), Rx.map((s) => s.unshielded.balances[unshieldedToken().raw] ?? 0n), Rx.filter((b) => b > 0n)
));
const waitForDust = (w: WalletFacade) => Rx.firstValueFrom(w.state().pipe(
  Rx.filter((s) => s.isSynced), Rx.map((s) => s.dust.walletBalance(new Date())), Rx.filter((b) => b > 0n)
));

async function registerForDust(wallet: WalletFacade, keystore: UnshieldedKeystore): Promise<void> {
  const state = await Rx.firstValueFrom(wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  if (state.dust.availableCoins.length > 0) { console.log("DUST already available"); return; }

  const utxos = state.unshielded.availableCoins.filter((c: any) => c.meta?.registeredForDustGeneration !== true);
  if (utxos.length === 0) { console.log("Waiting for DUST..."); await waitForDust(wallet); return; }

  console.log(`Registering ${utxos.length} NIGHT UTXO(s) for dust generation...`);
  const recipe = await wallet.registerNightUtxosForDustGeneration(utxos, keystore.getPublicKey(), (p) => keystore.signData(p));
  await wallet.submitTransaction(await wallet.finalizeRecipe(recipe));
  console.log("Waiting for DUST to generate..."); await waitForDust(wallet);
}

function computeHash(filePath: string): Uint8Array {
  return new Uint8Array(crypto.createHash("sha256").update(fs.readFileSync(filePath, "utf-8")).digest());
}

// === Main ===
async function main() {
  console.log("=== Proof of Authorship - Ledger 7.0 ===\n");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    const contractPath = path.join(process.cwd(), "contracts");
    const modulePath = path.join(contractPath, "managed", "proof-of-authorship", "contract", "index.cjs");
    if (!fs.existsSync(modulePath)) { console.error("Contract not compiled! Run: npm run compile"); process.exit(1); }

    const choice = await rl.question("Do you have a wallet seed? (y/n): ");
    let seed: string;
    if (choice.toLowerCase() === "y") {
      seed = (await rl.question("Enter 64-char hex seed: ")).trim();
    } else {
      seed = toHex(Buffer.from(generateRandomSeed()));
      console.log(`\n*** SAVE THIS SEED ***\n${seed}\n**********************\n`);
    }

    console.log("Building wallet...");
    const ctx = await buildWallet(seed);
    console.log(`\nUnshielded Address: ${ctx.unshieldedKeystore.getBech32Address()}`);
    console.log(`Faucet: https://faucet.preview.midnight.network/\n`);

    console.log("Syncing..."); await waitForSync(ctx.wallet);
    const state = await Rx.firstValueFrom(ctx.wallet.state());
    let balance = state.unshielded.balances[unshieldedToken().raw] ?? 0n;

    if (balance === 0n) {
      console.log("Wallet empty. Fund from faucet, then press Enter...");
      await rl.question(""); balance = await waitForFunds(ctx.wallet);
    }
    console.log(`Balance: ${balance.toLocaleString()} tNight`);

    await registerForDust(ctx.wallet, ctx.unshieldedKeystore);

    console.log("\nConfiguring providers...");
    const provider = await createProvider(ctx);
    const zkConfigPath = path.join(contractPath, "managed", "proof-of-authorship");
    const providers = {
      privateStateProvider: levelPrivateStateProvider({ privateStateStoreName: "proof-of-authorship-state", walletProvider: provider }),
      publicDataProvider: indexerPublicDataProvider(CONFIG.indexer, CONFIG.indexerWS),
      zkConfigProvider: new NodeZkConfigProvider(zkConfigPath),
      proofProvider: httpClientProofProvider(CONFIG.proofServer),
      walletProvider: provider, midnightProvider: provider,
    };

    console.log("Loading contract...");
    const ContractModule = await import(modulePath);
    const contract = new ContractModule.Contract({});

    console.log("Deploying (30-60 seconds)...");
    const deployed = await deployContract(providers, { contract, privateStateId: "proofOfAuthorshipState", initialPrivateState: {} });
    const address = (deployed.deployTxData as any).public.contractAddress;
    console.log(`Deployed at: ${address}`);

    const timestamp = new Date().toISOString();
    const hash = computeHash(path.join(contractPath, "proof-of-authorship.compact"));
    console.log(`\nRecording authorship: ${AUTHOR_NAME}, ${timestamp}`);

    const callTx = deployed.callTx as any;
    const txData = await callTx.recordAuthorship(AUTHOR_NAME, timestamp, hash, STATEMENT);
    console.log(`TX: ${txData.public.txId}, Block: ${txData.public.blockHeight}`);

    const info = {
      contractAddress: address, deployedAt: timestamp, txId: txData.public.txId,
      blockHeight: Number(txData.public.blockHeight), authorName: AUTHOR_NAME, statement: STATEMENT,
      contractHash: Buffer.from(hash).toString("hex"), walletAddress: ctx.unshieldedKeystore.getBech32Address(),
      network: "preview", sdkVersion: "Ledger 7.0",
    };
    fs.writeFileSync("deployment.json", JSON.stringify(info, null, 2));

    console.log("\n=== DEPLOYMENT SUCCESSFUL ===");
    console.log(`Contract: ${address}`);
    console.log(`Saved to: deployment.json`);

    await ctx.wallet.stop();
  } catch (e) { console.error("Failed:", e); process.exit(1); }
  finally { rl.close(); }
}

main().catch(console.error);
```

**Validate**: `npm run build && ls dist/deploy.js`

### Task 6: Update docs/compatibility-matrix.md

Add this section at the **top** of the file (after the header):

```markdown
---

## RESOLVED: Ledger 7.0 (February 2026)

The version compatibility issues documented below have been resolved with Ledger 7.0.

### Working Version Matrix

| Component | Version |
|-----------|---------|
| Compact version manager | 0.4.0 |
| Compact compiler | 0.28.0 |
| Language pragma | >= 0.20 |
| compact-runtime | 0.14.0 |
| midnight-js-* | 3.0.0 |
| ledger-v7 | 7.0.0 |
| wallet-sdk-facade | 1.0.0 |
| Proof Server | 7.0.0 (`midnightntwrk/proof-server:7.0.0 -v`) |

### Key Changes
- **Wallet SDK replaced**: `WalletBuilder` → `WalletFacade` + 3 sub-wallets
- **signRecipe bug**: Must implement manual signing workaround
- **DUST registration**: Required before deployment
- **Token lookup**: `unshieldedToken().raw` (not `nativeToken()`)
- **Proof server**: No `--network` flag, use `-v` only

### References
- [Migration Guide](https://github.com/midnightntwrk/example-counter/blob/main/MIGRATION_GUIDE.md)
- [Example Counter](https://github.com/midnightntwrk/example-counter)

---

## Previous Blockers (Historical)
```

---

## VALIDATION

```bash
# 1. Toolchain
compact --version  # → 0.4.0
compact list       # → 0.28.0

# 2. Contract pragma
head -1 contracts/proof-of-authorship.compact  # → pragma language_version >= 0.20;

# 3. Dependencies
npm ls @midnight-ntwrk/wallet-sdk-facade  # → 1.0.0

# 4. Compile
npm run compile && ls contracts/managed/proof-of-authorship/contract/index.cjs

# 5. Build
npm run build && ls dist/deploy.js

# 6. Deploy (manual)
# Terminal 1: docker run -p 6300:6300 midnightntwrk/proof-server:7.0.0 midnight-proof-server -v
# Terminal 2: npm run deploy
# Verify: cat deployment.json | jq '.contractAddress'
```

---

## ACCEPTANCE CRITERIA

- [ ] Compact 0.28.0 installed
- [ ] Contract pragma updated to `>= 0.20`
- [ ] package.json has Ledger 7.0 dependencies
- [ ] `npm run compile` succeeds
- [ ] `npm run build` succeeds (no TS errors)
- [ ] deploy.ts implements WalletFacade + signRecipe workaround + DUST registration
- [ ] Deployment creates valid deployment.json
- [ ] docs/compatibility-matrix.md updated

---

## GOTCHAS

| Issue | Solution |
|-------|----------|
| signRecipe "Failed to clone intent" | Use manual signing with correct proof markers |
| Zero balance despite funding | Use `unshieldedToken().raw` not `nativeToken()` |
| levelPrivateStateProvider error | Must pass `walletProvider` for encryption |
| Proof server rejects `--network` | Use `-v` only with 7.0.0 |
| DUST locked after failed tx | Restart wallet to recover |

**Confidence Score**: 8.5/10 — Complete working example exists in example-counter repo.
