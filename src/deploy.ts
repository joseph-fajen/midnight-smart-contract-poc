import { WalletBuilder } from "@midnight-ntwrk/wallet";
import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { NetworkId, nativeToken } from "@midnight-ntwrk/zswap";
import { WebSocket } from "ws";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as readline from "readline/promises";
import * as Rx from "rxjs";
import type { Wallet } from "@midnight-ntwrk/wallet-api";

// Fix WebSocket for Node.js environment
// @ts-ignore
globalThis.WebSocket = WebSocket;

// Configure for Midnight Preview Network
// Note: Preview uses TestNet network ID but different endpoints and bech32 prefix
setNetworkId("preview");

// Preview network connection endpoints (used by Lace Midnight Preview)
const PREVIEW_CONFIG = {
  indexer: "https://indexer.preview.midnight.network/api/v3/graphql",
  indexerWS: "wss://indexer.preview.midnight.network/api/v3/graphql/ws",
  node: "https://rpc.preview.midnight.network",
  proofServer: "http://127.0.0.1:6300",
};

// Authorship data
const AUTHOR_NAME = "Joseph Fajen";
const STATEMENT = "Deployed by Joseph Fajen as a proof of concept exercise";

// Get the native token identifier for balance lookups
const NATIVE_TOKEN = nativeToken();

// Helper to get balance from wallet state
const getBalance = (balances: Record<string, bigint>): bigint => {
  return balances[NATIVE_TOKEN] ?? 0n;
};

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
      Rx.map((s) => getBalance(s.balances)),
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
  console.log("  Proof of Authorship - Midnight Preview");
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

    // Build wallet using the new API
    // Note: Using NetworkId.TestNet as Preview shares the same network ID
    console.log("Building wallet...");
    const wallet = await WalletBuilder.build(
      PREVIEW_CONFIG.indexer,
      PREVIEW_CONFIG.indexerWS,
      PREVIEW_CONFIG.proofServer,
      PREVIEW_CONFIG.node,
      walletSeed,
      NetworkId.TestNet,
      "warn"
    );

    wallet.start();
    console.log("Wallet started, syncing...");

    // Try to get address immediately (may be available before full sync)
    const initialState = await Rx.firstValueFrom(wallet.state());
    if (initialState.address) {
      console.log(`Wallet address: ${initialState.address}`);
      console.log("(Address available - you can fund it now while sync continues)");
    }

    // Wait for initial sync with timeout info
    console.log("Waiting for network sync (this may take a minute)...");
    await Rx.firstValueFrom(
      wallet.state().pipe(
        Rx.filter((state) => state.syncProgress !== undefined)
      )
    );

    const state = await Rx.firstValueFrom(wallet.state());
    if (!initialState.address) {
      console.log(`Wallet address: ${state.address}`);
    }

    // Check balance
    let balance = getBalance(state.balances);

    if (balance === 0n) {
      console.log("\nWallet balance: 0");
      console.log("Please fund your wallet:");
      console.log("1. Go to: https://faucet.preview.midnight.network/");
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

    // Create wallet provider with new interface
    // Note: Using type assertions to bridge wallet SDK v5 and contracts v3-alpha type differences
    const walletState = await Rx.firstValueFrom(wallet.state());

    const walletProvider = {
      getCoinPublicKey: () => walletState.coinPublicKey,
      getEncryptionPublicKey: () => walletState.encryptionPublicKey,
      // balanceTx returns the balanced recipe (proving done by contracts library)
      balanceTx(tx: any, newCoins: any): Promise<any> {
        return wallet.balanceTransaction(tx, newCoins) as Promise<any>;
      },
      submitTx(tx: any): Promise<any> {
        return wallet.submitTransaction(tx) as Promise<any>;
      },
    };

    // Configure providers
    // Note: Using type assertions to bridge SDK version differences
    console.log("Configuring providers...");
    const zkConfigPath = path.join(contractPath, "managed", "proof-of-authorship");
    const providers = {
      privateStateProvider: levelPrivateStateProvider({
        privateStateStoreName: "proof-of-authorship-state",
      }),
      publicDataProvider: indexerPublicDataProvider(
        PREVIEW_CONFIG.indexer,
        PREVIEW_CONFIG.indexerWS
      ),
      zkConfigProvider: new NodeZkConfigProvider(zkConfigPath),
      proofProvider: httpClientProofProvider(PREVIEW_CONFIG.proofServer),
      walletProvider: walletProvider as any,
      midnightProvider: walletProvider as any,
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
    // Use type assertion since the dynamically imported contract doesn't carry full type info
    const callTx = deployed.callTx as unknown as {
      recordAuthorship: (
        author: string,
        time: string,
        hash: Uint8Array,
        msg: string
      ) => Promise<{ public: { txId: string; blockHeight: bigint } }>;
    };
    const txData = await callTx.recordAuthorship(
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
      network: "preview",
    };

    fs.writeFileSync("deployment.json", JSON.stringify(deploymentInfo, null, 2));
    console.log("\nDeployment info saved to deployment.json");

    console.log("\n===========================================");
    console.log("  DEPLOYMENT SUCCESSFUL!");
    console.log("===========================================");
    console.log(`\nContract Address: ${contractAddress}`);
    console.log(`\nVerify at: https://indexer.preview.midnight.network`);

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
