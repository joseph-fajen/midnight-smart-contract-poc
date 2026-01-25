import type {
  InitialAPI,
  ConnectedAPI,
  Configuration,
} from "@midnight-ntwrk/dapp-connector-api";

export interface WalletConnection {
  wallet: ConnectedAPI;
  config: Configuration;
  shieldedAddress: string;
  coinPublicKey: string;
  encryptionPublicKey: string;
}

export class WalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletError";
  }
}

// Find the first available Midnight wallet
function findWallet(): { name: string; connector: InitialAPI } | null {
  const midnight = window.midnight;
  if (!midnight) {
    console.log("window.midnight is not defined");
    return null;
  }

  // Log available wallets for debugging
  const walletNames = Object.keys(midnight);
  console.log("Available Midnight wallets:", walletNames);

  // Log details about each wallet
  for (const name of walletNames) {
    const connector = (midnight as Record<string, InitialAPI>)[name];
    console.log(`Wallet "${name}":`, connector);
    if (connector) {
      console.log(`  - name: ${connector.name}`);
      console.log(`  - apiVersion: ${connector.apiVersion}`);
      console.log(`  - has connect: ${"connect" in connector}`);
    }
  }

  // Just use mnLace directly if it exists
  if (midnight.mnLace) {
    console.log("Using mnLace wallet");
    return { name: "mnLace", connector: midnight.mnLace as InitialAPI };
  }

  // Fall back to first available wallet
  for (const name of walletNames) {
    const connector = (midnight as Record<string, InitialAPI>)[name];
    if (connector) {
      console.log(`Using fallback wallet: ${name}`);
      return { name, connector };
    }
  }

  return null;
}

export async function connectWallet(): Promise<WalletConnection> {
  const midnight = window.midnight;
  if (!midnight) {
    throw new WalletError(
      "Midnight wallet not found. Please install Lace Midnight Preview extension."
    );
  }

  const walletInfo = findWallet();
  if (!walletInfo) {
    console.error("window.midnight contents:", midnight);
    throw new WalletError(
      "No compatible Midnight wallet found. Please ensure Lace Midnight Preview is installed and enabled."
    );
  }

  const { connector } = walletInfo;

  // Connect to wallet with network ID (v4 API requires this)
  const timeoutMs = 30000;
  console.log("Calling wallet connect with networkId='preview'...");

  const walletPromise = connector.connect("preview");
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new WalletError("Wallet connection timed out after 30 seconds")),
      timeoutMs
    )
  );

  const wallet = await Promise.race([walletPromise, timeoutPromise]);
  console.log("Wallet connected:", wallet);

  // Get configuration (service URIs) - v4 API
  const config = await wallet.getConfiguration();
  console.log("Wallet configuration:", config);

  // Get wallet addresses - v4 API
  const addresses = await wallet.getShieldedAddresses();
  console.log("Shielded addresses:", addresses);

  return {
    wallet,
    config,
    shieldedAddress: addresses.shieldedAddress,
    coinPublicKey: addresses.shieldedCoinPublicKey,
    encryptionPublicKey: addresses.shieldedEncryptionPublicKey,
  };
}

export function isWalletAvailable(): boolean {
  return findWallet() !== null;
}
