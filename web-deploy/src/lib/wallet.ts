import type {
  DAppConnectorAPI,
  DAppConnectorWalletAPI,
  ServiceUriConfig,
} from "@midnight-ntwrk/dapp-connector-api";

export interface WalletConnection {
  wallet: DAppConnectorWalletAPI;
  uris: ServiceUriConfig;
  address: string;
}

export class WalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletError";
  }
}

export async function connectWallet(): Promise<WalletConnection> {
  const midnight = window.midnight;
  if (!midnight) {
    throw new WalletError(
      "Midnight wallet not found. Please install Lace Midnight Preview extension."
    );
  }

  const mnLace = midnight.mnLace;
  if (!mnLace) {
    throw new WalletError(
      "Lace Midnight wallet not available. Please ensure Lace Midnight Preview is installed and enabled."
    );
  }

  // Connect to wallet with timeout
  const timeoutMs = 30000;
  const walletPromise = mnLace.enable();
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new WalletError("Wallet connection timed out after 30 seconds")),
      timeoutMs
    )
  );

  const wallet = await Promise.race([walletPromise, timeoutPromise]);

  // Get service URIs from wallet
  const uris = await mnLace.serviceUriConfig();

  // Get wallet state for address
  const state = await wallet.state();

  return {
    wallet,
    uris,
    address: state.address,
  };
}

export function isWalletAvailable(): boolean {
  return !!(window.midnight?.mnLace);
}
