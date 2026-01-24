import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import type { ServiceUriConfig, DAppConnectorWalletAPI } from "@midnight-ntwrk/dapp-connector-api";

// Configure for Preview network
setNetworkId("preview");

// Circuit IDs for our contract
type CircuitId = "recordAuthorship";

export interface MidnightProviders {
  privateStateProvider: ReturnType<typeof levelPrivateStateProvider>;
  publicDataProvider: ReturnType<typeof indexerPublicDataProvider>;
  zkConfigProvider: FetchZkConfigProvider<CircuitId>;
  proofProvider: ReturnType<typeof httpClientProofProvider>;
  walletProvider: WalletProviderWrapper;
  midnightProvider: WalletProviderWrapper;
}

export interface WalletProviderWrapper {
  // Note: DApp connector returns bech32m encoded strings, not Uint8Array
  // The contracts library may expect different types, so we use any
  getCoinPublicKey: () => unknown;
  getEncryptionPublicKey: () => unknown;
  balanceTx: (tx: unknown, newCoins?: unknown) => Promise<unknown>;
  submitTx: (tx: unknown) => Promise<unknown>;
}

export async function createProviders(
  uris: ServiceUriConfig,
  wallet: DAppConnectorWalletAPI
): Promise<MidnightProviders> {
  // Get wallet state for keys
  const walletState = await wallet.state();

  // Create wallet provider wrapper that bridges Lace API to v3 SDK interface
  // Note: DApp connector returns bech32m encoded strings for keys
  // The contracts library should handle the type conversion internally
  const walletProvider: WalletProviderWrapper = {
    getCoinPublicKey: () => walletState.coinPublicKey as unknown,
    getEncryptionPublicKey: () => walletState.encryptionPublicKey as unknown,
    balanceTx: async (tx: unknown, newCoins?: unknown) => {
      // Lace wallet handles balancing and proving
      return wallet.balanceAndProveTransaction(tx as any, newCoins as any);
    },
    submitTx: async (tx: unknown) => {
      return wallet.submitTransaction(tx as any);
    },
  };

  // Create providers using Lace's service URIs
  const providers: MidnightProviders = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: "proof-of-authorship-browser-state",
    }),
    publicDataProvider: indexerPublicDataProvider(
      uris.indexerUri,
      uris.indexerWsUri
    ),
    zkConfigProvider: new FetchZkConfigProvider<CircuitId>(
      window.location.origin,
      fetch.bind(window)
    ),
    proofProvider: httpClientProofProvider(uris.proverServerUri),
    walletProvider: walletProvider,
    midnightProvider: walletProvider,
  };

  return providers;
}
