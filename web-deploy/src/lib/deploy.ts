import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import type { MidnightProviders } from "./providers";

// Authorship data constants (matching CLI deploy.ts)
const AUTHOR_NAME = "Joseph Fajen";
const STATEMENT = "Deployed by Joseph Fajen as a proof of concept exercise";

// Contract source for hash computation
const CONTRACT_SOURCE = `pragma language_version 0.18;

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
`;

export interface DeploymentResult {
  contractAddress: string;
  txId: string;
  blockHeight: number;
  timestamp: string;
  authorName: string;
  statement: string;
  contractHash: string;
  walletAddress: string;
  network: string;
}

export type DeployStatus =
  | "idle"
  | "loading-contract"
  | "deploying"
  | "recording"
  | "success"
  | "error";

export interface DeployProgress {
  status: DeployStatus;
  message: string;
}

async function computeContractHash(): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(CONTRACT_SOURCE);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hashBuffer);
}

// Contract module interface for the dynamically loaded contract
interface ContractModule {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Contract: new (initialState: Record<string, unknown>) => any;
}

// Load the contract module
async function loadContractModule(): Promise<ContractModule> {
  // Import the contract from src/contract where Vite can bundle it
  const module = await import("../contract/index.cjs");
  return module as ContractModule;
}

export async function deployProofOfAuthorship(
  providers: MidnightProviders,
  walletAddress: string,
  onProgress: (progress: DeployProgress) => void
): Promise<DeploymentResult> {
  onProgress({ status: "loading-contract", message: "Loading compiled contract..." });

  // Load the contract module
  const ContractModule = await loadContractModule();
  const contractInstance = new ContractModule.Contract({});

  onProgress({ status: "deploying", message: "Deploying contract to Preview network..." });

  // Deploy the contract
  // Note: Using type assertion as the providers interface may differ slightly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deployed = await (deployContract as any)(providers, {
    contract: contractInstance,
    privateStateId: "proofOfAuthorshipBrowserState",
    initialPrivateState: {},
  });

  const contractAddress = (deployed.deployTxData as any).public.contractAddress;
  console.log("Contract deployed at:", contractAddress);

  onProgress({ status: "recording", message: "Recording authorship data on-chain..." });

  // Prepare authorship data
  const timestamp = new Date().toISOString();
  const contractHash = await computeContractHash();

  // Call recordAuthorship circuit
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

  console.log("Transaction ID:", txData.public.txId);
  console.log("Block height:", txData.public.blockHeight);

  const result: DeploymentResult = {
    contractAddress,
    txId: txData.public.txId,
    blockHeight: Number(txData.public.blockHeight),
    timestamp,
    authorName: AUTHOR_NAME,
    statement: STATEMENT,
    contractHash: Array.from(contractHash)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
    walletAddress,
    network: "preview",
  };

  onProgress({ status: "success", message: "Deployment complete!" });

  return result;
}

export function downloadDeploymentJson(result: DeploymentResult): void {
  const json = JSON.stringify(result, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "deployment.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
