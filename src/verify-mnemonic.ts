/**
 * Verification script: Convert Lace mnemonic to wallet address
 *
 * This script tries multiple derivation methods to find one that matches
 * your Lace wallet address.
 *
 * Key discovery from Midnight docs:
 * - Midnight uses HD path: m/44'/2400'/account'/role/index
 * - Role 3 (Roles.Zswap) is used for wallet seed derivation
 * - The @midnight-ntwrk/wallet-sdk-hd package handles this
 *
 * Usage: npm run verify-mnemonic
 */

import { WalletBuilder } from "@midnight-ntwrk/wallet";
import { mnemonicToEntropy, mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { HDWallet, Roles } from "@midnight-ntwrk/wallet-sdk-hd";
import {
  NetworkId,
  setNetworkId,
  getZswapNetworkId,
} from "@midnight-ntwrk/midnight-js-network-id";
import { nativeToken } from "@midnight-ntwrk/ledger";
import { WebSocket } from "ws";
import * as readline from "readline/promises";
import * as crypto from "crypto";
import * as Rx from "rxjs";

// Fix WebSocket for Node.js environment
// @ts-ignore
globalThis.WebSocket = WebSocket;

// Configure for Midnight Preview Network
setNetworkId(NetworkId.TestNet);

// Preview network endpoints
const PREVIEW_CONFIG = {
  indexer: "https://indexer.preview.midnight.network/api/v3/graphql",
  indexerWS: "wss://indexer.preview.midnight.network/api/v3/graphql/ws",
  node: "https://rpc.preview.midnight.network",
  proofServer: "http://127.0.0.1:6300",
};

/**
 * Icarus master key derivation (SLIP-0023 / CIP-3)
 */
function deriveIcarusMasterKey(entropy: Uint8Array, password: string = ""): Uint8Array {
  const derived = crypto.pbkdf2Sync(
    Buffer.from(password),
    Buffer.from(entropy),
    4096,
    96,
    "sha512"
  );
  derived[0] &= 0xf8;
  derived[31] = (derived[31] & 0x1f) | 0x40;
  return new Uint8Array(derived.subarray(0, 32));
}

/**
 * Midnight HD wallet derivation (from Midnight docs)
 * Path: m/44'/2400'/account'/role/index
 * Uses Roles.Zswap (role 3) for wallet seed
 */
function deriveMidnightWalletSeed(bip39Seed: Uint8Array): string | null {
  try {
    const generatedWallet = HDWallet.fromSeed(bip39Seed);

    if (generatedWallet.type !== "seedOk") {
      console.log(`  HDWallet.fromSeed failed: ${generatedWallet.type}`);
      return null;
    }

    // Derive using account 0, role Zswap (3), index 0
    // This follows the documented path: m/44'/2400'/0'/3/0
    const zswapKey = generatedWallet.hdWallet
      .selectAccount(0)
      .selectRole(Roles.Zswap)
      .deriveKeyAt(0);

    if (zswapKey.type === "keyDerived") {
      // The derived key is the wallet seed to use with WalletBuilder
      return Buffer.from(zswapKey.key).toString("hex");
    } else {
      console.log(`  Key derivation failed: ${zswapKey.type}`);
      return null;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`  HDWallet error: ${msg}`);
    return null;
  }
}

async function testSeed(seedHex: string, label: string): Promise<string | null> {
  try {
    console.log(`\nTesting ${label}...`);
    console.log(`  Seed: ${seedHex.substring(0, 16)}...${seedHex.substring(seedHex.length - 16)}`);

    const wallet = await WalletBuilder.build(
      PREVIEW_CONFIG.indexer,
      PREVIEW_CONFIG.indexerWS,
      PREVIEW_CONFIG.proofServer,
      PREVIEW_CONFIG.node,
      seedHex,
      getZswapNetworkId(),
      "error" // minimize logging
    );

    wallet.start();

    const state = await Rx.firstValueFrom(
      wallet.state().pipe(
        Rx.filter((s) => s.address !== undefined),
        Rx.timeout(15000)
      )
    );

    const address = state.address;
    const balance = state.balances[nativeToken()] || 0n;

    await wallet.close();

    console.log(`  Address: ${address}`);
    console.log(`  Balance: ${balance} tDUST`);

    return address;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`  Failed: ${msg.substring(0, 80)}`);
    return null;
  }
}

async function main() {
  console.log("===========================================");
  console.log("  Mnemonic Derivation Test Suite");
  console.log("===========================================\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log("Enter your 24-word mnemonic phrase from Lace.");
    console.log("(Words separated by spaces)\n");

    const mnemonic = await rl.question("Mnemonic: ");
    const cleanMnemonic = mnemonic.trim().toLowerCase();

    if (!validateMnemonic(cleanMnemonic, wordlist)) {
      console.error("\nError: Invalid mnemonic phrase.");
      process.exit(1);
    }

    console.log("\nMnemonic valid. Testing multiple derivation methods...");

    // Get entropy and BIP-39 seed
    const entropy = mnemonicToEntropy(cleanMnemonic, wordlist);
    const bip39Seed = mnemonicToSeedSync(cleanMnemonic, "");

    console.log(`\nEntropy (32 bytes): ${Buffer.from(entropy).toString("hex").substring(0, 16)}...`);
    console.log(`BIP-39 Seed (64 bytes): ${Buffer.from(bip39Seed).toString("hex").substring(0, 16)}...`);

    console.log("\n===========================================");
    console.log("  Testing Different Derivation Methods");
    console.log("===========================================");

    const results: { label: string; seed: string; address: string | null }[] = [];

    // Method 1: Raw entropy (32 bytes)
    const entropyHex = Buffer.from(entropy).toString("hex");
    results.push({
      label: "1. Raw Entropy",
      seed: entropyHex,
      address: await testSeed(entropyHex, "Raw Entropy (32 bytes)")
    });

    // Method 2: Icarus-derived key (32 bytes)
    const icarusKey = deriveIcarusMasterKey(entropy);
    const icarusHex = Buffer.from(icarusKey).toString("hex");
    results.push({
      label: "2. Icarus Derivation",
      seed: icarusHex,
      address: await testSeed(icarusHex, "Icarus/CIP-3 Derivation (32 bytes)")
    });

    // Method 3: First 32 bytes of BIP-39 seed
    const bip39First32 = Buffer.from(bip39Seed.subarray(0, 32)).toString("hex");
    results.push({
      label: "3. BIP-39 Seed (first 32 bytes)",
      seed: bip39First32,
      address: await testSeed(bip39First32, "BIP-39 Seed first 32 bytes")
    });

    // Method 4: Last 32 bytes of BIP-39 seed
    const bip39Last32 = Buffer.from(bip39Seed.subarray(32, 64)).toString("hex");
    results.push({
      label: "4. BIP-39 Seed (last 32 bytes)",
      seed: bip39Last32,
      address: await testSeed(bip39Last32, "BIP-39 Seed last 32 bytes")
    });

    // Method 5: Midnight HD Derivation (RECOMMENDED - from Midnight docs)
    // Path: m/44'/2400'/0'/3/0 (account 0, role Zswap, index 0)
    console.log("\n===========================================");
    console.log("  Method 5: Midnight HD Derivation (Recommended)");
    console.log("  Path: m/44'/2400'/0'/3/0 (Roles.Zswap)");
    console.log("===========================================");

    const midnightSeed = deriveMidnightWalletSeed(bip39Seed);
    if (midnightSeed) {
      results.push({
        label: "5. Midnight HD (m/44'/2400'/0'/3/0)",
        seed: midnightSeed,
        address: await testSeed(midnightSeed, "Midnight HD Derivation (Roles.Zswap)")
      });
    } else {
      console.log("\n  Method 5 failed - could not derive Midnight wallet seed");
      results.push({
        label: "5. Midnight HD (m/44'/2400'/0'/3/0)",
        seed: "",
        address: null
      });
    }

    // Summary
    console.log("\n===========================================");
    console.log("  SUMMARY - Compare with your Lace addresses");
    console.log("===========================================\n");

    console.log("Your Lace addresses should be one of these:\n");
    for (const r of results) {
      if (r.address) {
        console.log(`${r.label}:`);
        console.log(`  ${r.address}\n`);
      }
    }

    console.log("-------------------------------------------");
    console.log("Enter the number (1-5) that matches your Lace address,");
    console.log("or 0 if none match:\n");
    console.log("NOTE: Method 5 (Midnight HD) is the documented approach");
    console.log("and most likely to match your Lace wallet.\n");

    const choice = await rl.question("Choice: ");
    const choiceNum = parseInt(choice, 10);

    if (choiceNum >= 1 && choiceNum <= 5) {
      const selected = results[choiceNum - 1];
      if (selected.seed) {
        console.log(`\n===========================================`);
        console.log(`  SUCCESS! Use this seed for deployment:`);
        console.log(`===========================================`);
        console.log(`\n${selected.seed}\n`);

        if (choiceNum === 5) {
          console.log("This is the Midnight HD derivation method.");
          console.log("You can update deploy.ts to use this derivation");
          console.log("from your mnemonic automatically.");
        }
      } else {
        console.log("\nThis method failed to derive a seed.");
      }
    } else {
      console.log("\nNo match found. The derivation method Lace uses");
      console.log("may be different from these approaches.");
      console.log("\nConsider asking your Discord contact for specifics");
      console.log("on how to export/derive the seed for CLI use.");
    }

  } catch (error) {
    console.error("\nError:", error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main().catch(console.error);
