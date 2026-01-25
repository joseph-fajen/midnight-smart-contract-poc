import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import type { ConnectedAPI, Configuration } from "@midnight-ntwrk/dapp-connector-api";

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
  getCoinPublicKey: () => string;
  getEncryptionPublicKey: () => string;
  balanceTx: (tx: unknown, newCoins?: unknown) => Promise<unknown>;
  submitTx: (tx: unknown) => Promise<unknown>;
}

export async function createProviders(
  config: Configuration,
  wallet: ConnectedAPI,
  coinPublicKey: string,
  encryptionPublicKey: string
): Promise<MidnightProviders> {
  // Ensure network ID is set
  setNetworkId("preview");
  console.log("Network ID set to preview");
  console.log("Service config:", config);

  // Create wallet provider wrapper that bridges Lace v4 API to contracts library
  const walletProvider: WalletProviderWrapper = {
    getCoinPublicKey: () => coinPublicKey,
    getEncryptionPublicKey: () => encryptionPublicKey,
    balanceTx: async (tx: unknown, newCoins?: unknown) => {
      // v4 API uses balanceUnsealedTransaction with serialized tx string
      console.log("Balancing transaction...");
      const txString = typeof tx === "string" ? tx : JSON.stringify(tx);
      const result = await wallet.balanceUnsealedTransaction(txString);
      return result.tx;
    },
    submitTx: async (tx: unknown) => {
      console.log("Submitting transaction...");
      const txString = typeof tx === "string" ? tx : JSON.stringify(tx);
      await wallet.submitTransaction(txString);
      return { success: true };
    },
  };

  // Use proverServerUri from config, or fallback to localhost
  const proofServerUri = config.proverServerUri || "http://127.0.0.1:6300";
  console.log("Using proof server:", proofServerUri);

  // Create providers using Lace's service URIs
  const providers: MidnightProviders = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: "proof-of-authorship-browser-state",
      walletProvider: {
        getEncryptionPublicKey: () => encryptionPublicKey,
      },
    }),
    publicDataProvider: indexerPublicDataProvider(
      config.indexerUri,
      config.indexerWsUri
    ),
    zkConfigProvider: new FetchZkConfigProvider<CircuitId>(
      window.location.origin,
      fetch.bind(window)
    ),
    proofProvider: httpClientProofProvider(proofServerUri),
    walletProvider: walletProvider,
    midnightProvider: walletProvider,
  };

  return providers;
}
