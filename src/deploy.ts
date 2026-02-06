/**
 * Proof of Authorship - CLI Deployment Script (Ledger 7.0)
 *
 * Deploys a "Proof of Authorship" contract to Midnight Preview network,
 * recording authorship data on-chain via the recordAuthorship circuit.
 *
 * Based on patterns from: https://github.com/midnightntwrk/example-counter
 */

import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { setNetworkId, getNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { toHex } from "@midnight-ntwrk/midnight-js-utils";
import type { MidnightProvider, WalletProvider } from "@midnight-ntwrk/midnight-js-types";
import * as ledger from "@midnight-ntwrk/ledger-v7";
import { unshieldedToken } from "@midnight-ntwrk/ledger-v7";
import { WalletFacade } from "@midnight-ntwrk/wallet-sdk-facade";
import { ShieldedWallet } from "@midnight-ntwrk/wallet-sdk-shielded";
import { DustWallet } from "@midnight-ntwrk/wallet-sdk-dust-wallet";
import {
  createKeystore,
  InMemoryTransactionHistoryStorage,
  PublicKey,
  UnshieldedWallet,
  type UnshieldedKeystore,
} from "@midnight-ntwrk/wallet-sdk-unshielded-wallet";
import { HDWallet, Roles, generateRandomSeed } from "@midnight-ntwrk/wallet-sdk-hd";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { WebSocket } from "ws";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as readline from "readline/promises";
import * as Rx from "rxjs";
import { Buffer } from "buffer";

// Required for GraphQL subscriptions (wallet sync) to work in Node.js
// @ts-expect-error: Needed for apollo WebSocket support
globalThis.WebSocket = WebSocket;

// Configure for Midnight Preview Network
setNetworkId("preview");

// Preview network connection endpoints
const CONFIG = {
  indexer: "https://indexer.preview.midnight.network/api/v3/graphql",
  indexerWS: "wss://indexer.preview.midnight.network/api/v3/graphql/ws",
  node: "https://rpc.preview.midnight.network",
  proofServer: "http://127.0.0.1:6300",
};

// Contract paths
const CONTRACT_PATH = path.join(process.cwd(), "contracts");
const ZK_CONFIG_PATH = path.join(CONTRACT_PATH, "managed", "proof-of-authorship");
const CONTRACT_MODULE_PATH = path.join(ZK_CONFIG_PATH, "contract", "index.cjs");
const CONTRACT_SOURCE_PATH = path.join(CONTRACT_PATH, "proof-of-authorship.compact");

// Authorship data
const AUTHOR_NAME = "Joseph Fajen";
const STATEMENT = "Deployed by Joseph Fajen as a proof of concept exercise";

interface WalletContext {
  wallet: WalletFacade;
  shieldedSecretKeys: ledger.ZswapSecretKeys;
  dustSecretKey: ledger.DustSecretKey;
  unshieldedKeystore: UnshieldedKeystore;
}

// ============================================================================
// HD Wallet Key Derivation
// ============================================================================

/**
 * Derive HD wallet keys for all three roles (Zswap, NightExternal, Dust)
 * from a hex-encoded seed using BIP-44 style derivation at account 0, index 0.
 */
function deriveKeysFromSeed(seed: string) {
  const hdWallet = HDWallet.fromSeed(Buffer.from(seed, "hex"));
  if (hdWallet.type !== "seedOk") {
    throw new Error("Failed to initialize HDWallet from seed");
  }

  const derivationResult = hdWallet.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);

  if (derivationResult.type !== "keysDerived") {
    throw new Error("Failed to derive keys");
  }

  hdWallet.hdWallet.clear();
  return derivationResult.keys;
}

// ============================================================================
// signRecipe Bug Workaround
// ============================================================================

/**
 * Sign all unshielded offers in a transaction's intents, using the correct
 * proof marker for Intent.deserialize. This works around a bug in the wallet
 * SDK where signRecipe hardcodes 'pre-proof', which fails for proven
 * (UnboundTransaction) intents that contain 'proof' data.
 */
function signTransactionIntents(
  tx: { intents?: Map<number, any> },
  signFn: (payload: Uint8Array) => ledger.Signature,
  proofMarker: "proof" | "pre-proof"
): void {
  if (!tx.intents || tx.intents.size === 0) return;

  for (const segment of tx.intents.keys()) {
    const intent = tx.intents.get(segment);
    if (!intent) continue;

    // Clone the intent with the correct proof marker
    const cloned = ledger.Intent.deserialize<
      ledger.SignatureEnabled,
      ledger.Proofish,
      ledger.PreBinding
    >("signature", proofMarker, "pre-binding", intent.serialize());

    const sigData = cloned.signatureData(segment);
    const signature = signFn(sigData);

    if (cloned.fallibleUnshieldedOffer) {
      const sigs = cloned.fallibleUnshieldedOffer.inputs.map(
        (_: ledger.UtxoSpend, i: number) =>
          cloned.fallibleUnshieldedOffer!.signatures.at(i) ?? signature
      );
      cloned.fallibleUnshieldedOffer =
        cloned.fallibleUnshieldedOffer.addSignatures(sigs);
    }

    if (cloned.guaranteedUnshieldedOffer) {
      const sigs = cloned.guaranteedUnshieldedOffer.inputs.map(
        (_: ledger.UtxoSpend, i: number) =>
          cloned.guaranteedUnshieldedOffer!.signatures.at(i) ?? signature
      );
      cloned.guaranteedUnshieldedOffer =
        cloned.guaranteedUnshieldedOffer.addSignatures(sigs);
    }

    tx.intents.set(segment, cloned);
  }
}

// ============================================================================
// Wallet/Midnight Provider Bridge
// ============================================================================

/**
 * Create the unified WalletProvider & MidnightProvider for midnight-js.
 * This bridges the wallet-sdk-facade to the midnight-js contract API.
 */
async function createWalletAndMidnightProvider(
  ctx: WalletContext
): Promise<WalletProvider & MidnightProvider> {
  const state = await Rx.firstValueFrom(
    ctx.wallet.state().pipe(Rx.filter((s) => s.isSynced))
  );
  return {
    getCoinPublicKey() {
      return state.shielded.coinPublicKey.toHexString();
    },
    getEncryptionPublicKey() {
      return state.shielded.encryptionPublicKey.toHexString();
    },
    async balanceTx(tx, ttl?) {
      const recipe = await ctx.wallet.balanceUnboundTransaction(
        tx,
        {
          shieldedSecretKeys: ctx.shieldedSecretKeys,
          dustSecretKey: ctx.dustSecretKey,
        },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) }
      );

      // Work around wallet SDK bug: sign manually with correct proof markers
      const signFn = (payload: Uint8Array) =>
        ctx.unshieldedKeystore.signData(payload);
      signTransactionIntents(recipe.baseTransaction, signFn, "proof");
      if (recipe.balancingTransaction) {
        signTransactionIntents(recipe.balancingTransaction, signFn, "pre-proof");
      }

      return ctx.wallet.finalizeRecipe(recipe);
    },
    submitTx(tx) {
      return ctx.wallet.submitTransaction(tx) as any;
    },
  };
}

// ============================================================================
// Wallet Building
// ============================================================================

function buildShieldedConfig() {
  return {
    networkId: getNetworkId(),
    indexerClientConnection: {
      indexerHttpUrl: CONFIG.indexer,
      indexerWsUrl: CONFIG.indexerWS,
    },
    provingServerUrl: new URL(CONFIG.proofServer),
    relayURL: new URL(CONFIG.node.replace(/^http/, "ws")),
  };
}

function buildUnshieldedConfig() {
  return {
    networkId: getNetworkId(),
    indexerClientConnection: {
      indexerHttpUrl: CONFIG.indexer,
      indexerWsUrl: CONFIG.indexerWS,
    },
    txHistoryStorage: new InMemoryTransactionHistoryStorage(),
  };
}

function buildDustConfig() {
  return {
    networkId: getNetworkId(),
    costParameters: {
      additionalFeeOverhead: 300_000_000_000_000n,
      feeBlocksMargin: 5,
    },
    indexerClientConnection: {
      indexerHttpUrl: CONFIG.indexer,
      indexerWsUrl: CONFIG.indexerWS,
    },
    provingServerUrl: new URL(CONFIG.proofServer),
    relayURL: new URL(CONFIG.node.replace(/^http/, "ws")),
  };
}

/**
 * Build a WalletFacade with three sub-wallets from an HD seed.
 */
async function buildWallet(seed: string): Promise<WalletContext> {
  const keys = deriveKeysFromSeed(seed);
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(
    keys[Roles.NightExternal],
    getNetworkId()
  );

  const shieldedWallet = ShieldedWallet(buildShieldedConfig()).startWithSecretKeys(
    shieldedSecretKeys
  );
  const unshieldedWallet = UnshieldedWallet(buildUnshieldedConfig()).startWithPublicKey(
    PublicKey.fromKeyStore(unshieldedKeystore)
  );
  const dustWallet = DustWallet(buildDustConfig()).startWithSecretKey(
    dustSecretKey,
    ledger.LedgerParameters.initialParameters().dust
  );

  const wallet = new WalletFacade(shieldedWallet, unshieldedWallet, dustWallet);
  await wallet.start(shieldedSecretKeys, dustSecretKey);

  return { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };
}

// ============================================================================
// Utility Functions
// ============================================================================

const formatBalance = (balance: bigint): string => balance.toLocaleString();

/** Wait until the wallet has fully synced with the network. */
const waitForSync = (wallet: WalletFacade) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(5_000),
      Rx.filter((state) => state.isSynced)
    )
  );

/** Wait until the wallet has a non-zero unshielded balance. */
const waitForFunds = (wallet: WalletFacade): Promise<bigint> =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(10_000),
      Rx.filter((state) => state.isSynced),
      Rx.map((s) => s.unshielded.balances[unshieldedToken().raw] ?? 0n),
      Rx.filter((balance) => balance > 0n)
    )
  );

/** Wait until DUST balance is non-zero. */
const waitForDust = (wallet: WalletFacade): Promise<bigint> =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(5_000),
      Rx.filter((s) => s.isSynced),
      Rx.filter((s) => s.dust.walletBalance(new Date()) > 0n),
      Rx.map((s) => s.dust.walletBalance(new Date()))
    )
  );

/**
 * Register unshielded NIGHT UTXOs for dust generation.
 * DUST is the non-transferable fee token used by the Midnight network.
 */
async function registerForDustGeneration(
  wallet: WalletFacade,
  unshieldedKeystore: UnshieldedKeystore
): Promise<void> {
  const state = await Rx.firstValueFrom(
    wallet.state().pipe(Rx.filter((s) => s.isSynced))
  );

  // Check if dust is already available
  if (state.dust.availableCoins.length > 0) {
    const dustBal = state.dust.walletBalance(new Date());
    console.log(`  DUST already available: ${formatBalance(dustBal)}`);
    return;
  }

  // Only register coins that haven't been designated yet
  const nightUtxos = state.unshielded.availableCoins.filter(
    (coin: any) => coin.meta?.registeredForDustGeneration !== true
  );

  if (nightUtxos.length === 0) {
    console.log("  Waiting for DUST to generate...");
    const dustBal = await waitForDust(wallet);
    console.log(`  DUST available: ${formatBalance(dustBal)}`);
    return;
  }

  console.log(`  Registering ${nightUtxos.length} NIGHT UTXO(s) for dust generation...`);
  const recipe = await wallet.registerNightUtxosForDustGeneration(
    nightUtxos,
    unshieldedKeystore.getPublicKey(),
    (payload) => unshieldedKeystore.signData(payload)
  );
  const finalized = await wallet.finalizeRecipe(recipe);
  await wallet.submitTransaction(finalized);

  console.log("  Waiting for DUST to generate...");
  const dustBal = await waitForDust(wallet);
  console.log(`  DUST available: ${formatBalance(dustBal)}`);
}

/** Compute SHA-256 hash of contract source code. */
function computeContractHash(filePath: string): Uint8Array {
  const source = fs.readFileSync(filePath, "utf-8");
  return new Uint8Array(crypto.createHash("sha256").update(source).digest());
}

/** Runs an async operation with an animated spinner. */
async function withStatus<T>(message: string, fn: () => Promise<T>): Promise<T> {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(`\r  ${frames[i++ % frames.length]} ${message}`);
  }, 80);
  try {
    const result = await fn();
    clearInterval(interval);
    process.stdout.write(`\r  ✓ ${message}\n`);
    return result;
  } catch (e) {
    clearInterval(interval);
    process.stdout.write(`\r  ✗ ${message}\n`);
    throw e;
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const DIV = "══════════════════════════════════════════════════════════════";

  console.log(`
${DIV}
  Proof of Authorship - Midnight Preview (Ledger 7.0)
${DIV}
`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // Check if contract is compiled
    if (!fs.existsSync(CONTRACT_MODULE_PATH)) {
      console.error("Contract not compiled! Run: npm run compile");
      process.exit(1);
    }

    // Get or generate wallet seed
    const choice = await rl.question("Do you have a wallet seed? (y/n): ");

    let seed: string;
    if (choice.toLowerCase() === "y" || choice.toLowerCase() === "yes") {
      seed = (await rl.question("Enter 64-character hex seed: ")).trim();
      if (seed.length !== 64) {
        console.error("Seed must be 64 hex characters");
        process.exit(1);
      }
    } else {
      seed = toHex(Buffer.from(generateRandomSeed()));
      console.log(`
${DIV}
  *** SAVE THIS SEED - YOU WILL NEED IT TO RECOVER YOUR WALLET ***
  ${seed}
${DIV}
`);
    }

    // Build wallet
    const ctx = await withStatus("Building wallet", () => buildWallet(seed));

    const networkId = getNetworkId();
    console.log(`
${DIV}
  Wallet Overview                            Network: ${networkId}
${DIV}
  Seed: ${seed}

  Unshielded Address (send tNight here):
  ${ctx.unshieldedKeystore.getBech32Address()}

  Fund your wallet with tNight from the Preview faucet:
  https://faucet.preview.midnight.network/
${DIV}
`);

    // Wait for sync
    const syncedState = await withStatus("Syncing with network", () =>
      waitForSync(ctx.wallet)
    );

    // Check balance
    let balance = syncedState.unshielded.balances[unshieldedToken().raw] ?? 0n;
    console.log(`  Balance: ${formatBalance(balance)} tNight`);

    if (balance === 0n) {
      console.log("\n  Waiting for incoming tokens (fund wallet via faucet)...");
      balance = await waitForFunds(ctx.wallet);
      console.log(`  Balance: ${formatBalance(balance)} tNight`);
    }

    // Register for DUST
    console.log("\nPreparing DUST for transaction fees:");
    await registerForDustGeneration(ctx.wallet, ctx.unshieldedKeystore);

    // Configure providers
    console.log("\nConfiguring providers...");
    const walletAndMidnightProvider = await createWalletAndMidnightProvider(ctx);
    const zkConfigProvider = new NodeZkConfigProvider(ZK_CONFIG_PATH);

    const providers = {
      privateStateProvider: levelPrivateStateProvider({
        privateStateStoreName: "proof-of-authorship-state",
        walletProvider: walletAndMidnightProvider,
      }),
      publicDataProvider: indexerPublicDataProvider(CONFIG.indexer, CONFIG.indexerWS),
      zkConfigProvider,
      proofProvider: httpClientProofProvider(CONFIG.proofServer, zkConfigProvider),
      walletProvider: walletAndMidnightProvider,
      midnightProvider: walletAndMidnightProvider,
    };

    // Load and compile contract
    console.log("\nLoading contract...");
    const ContractModule = await import(CONTRACT_MODULE_PATH);

    // Create compiled contract with vacant witnesses and file assets
    // Type assertion needed because the generic inference is complex
    const compiledContract = CompiledContract.make(
      "proof-of-authorship",
      ContractModule.Contract as any
    ).pipe(
      CompiledContract.withVacantWitnesses,
      CompiledContract.withCompiledFileAssets(ZK_CONFIG_PATH)
    ) as any;

    // Deploy contract
    // Our contract has no private state and no constructor args
    console.log("\nDeploying contract (this may take 30-60 seconds)...");
    const deployed = await withStatus("Deploying contract", async () => {
      // Use type assertion because our contract has undefined private state
      // and no constructor parameters
      return await (deployContract as any)(providers, {
        compiledContract,
      });
    });

    const contractAddress = deployed.deployTxData.public.contractAddress;
    console.log(`\n  Contract deployed at: ${contractAddress}`);

    // Prepare authorship data
    const timestamp = new Date().toISOString();
    const contractHash = computeContractHash(CONTRACT_SOURCE_PATH);

    console.log(`
Recording authorship data:
  Author:    ${AUTHOR_NAME}
  Timestamp: ${timestamp}
  Hash:      ${Buffer.from(contractHash).toString("hex")}
  Statement: ${STATEMENT}
`);

    // Call recordAuthorship circuit
    const txData = await withStatus("Recording authorship on-chain", async () => {
      const callTx = deployed.callTx as unknown as {
        recordAuthorship: (
          author: string,
          time: string,
          hash: Uint8Array,
          msg: string
        ) => Promise<{ public: { txId: string; blockHeight: bigint } }>;
      };
      return callTx.recordAuthorship(AUTHOR_NAME, timestamp, contractHash, STATEMENT);
    });

    console.log(`  Transaction ID: ${txData.public.txId}`);
    console.log(`  Block height: ${txData.public.blockHeight}`);

    // Save deployment info
    const deploymentInfo = {
      contractAddress,
      deployedAt: timestamp,
      txId: txData.public.txId,
      blockHeight: Number(txData.public.blockHeight),
      authorName: AUTHOR_NAME,
      statement: STATEMENT,
      contractHash: Buffer.from(contractHash).toString("hex"),
      walletAddress: ctx.unshieldedKeystore.getBech32Address(),
      network: "preview",
      sdkVersion: "Ledger 7.0",
    };

    fs.writeFileSync("deployment.json", JSON.stringify(deploymentInfo, null, 2));

    console.log(`
${DIV}
  DEPLOYMENT SUCCESSFUL!
${DIV}

  Contract Address: ${contractAddress}
  Saved to: deployment.json

  Verify via indexer:
  https://indexer.preview.midnight.network
${DIV}
`);

    // Cleanup
    await ctx.wallet.stop();
  } catch (error) {
    console.error("\nDeployment failed:", error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main().catch(console.error);
