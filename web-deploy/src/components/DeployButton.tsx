import { useState, useCallback } from "react";
import { connectWallet, isWalletAvailable, type WalletConnection } from "../lib/wallet";
import { createProviders } from "../lib/providers";
import {
  deployProofOfAuthorship,
  downloadDeploymentJson,
  type DeploymentResult,
  type DeployProgress,
} from "../lib/deploy";

type Status = "idle" | "connecting" | "connected" | "deploying" | "success" | "error";

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
    padding: "24px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  button: {
    padding: "12px 24px",
    fontSize: "16px",
    fontWeight: 600,
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  primaryButton: {
    backgroundColor: "#6366f1",
    color: "white",
  },
  secondaryButton: {
    backgroundColor: "#22c55e",
    color: "white",
  },
  disabledButton: {
    backgroundColor: "#4b5563",
    color: "#9ca3af",
    cursor: "not-allowed",
  },
  status: {
    padding: "12px 16px",
    borderRadius: "8px",
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    border: "1px solid rgba(99, 102, 241, 0.2)",
  },
  error: {
    padding: "12px 16px",
    borderRadius: "8px",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#fca5a5",
  },
  success: {
    padding: "16px",
    borderRadius: "8px",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    border: "1px solid rgba(34, 197, 94, 0.3)",
  },
  resultItem: {
    marginBottom: "8px",
  },
  label: {
    color: "#9ca3af",
    fontSize: "12px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  value: {
    color: "#e0e0e0",
    fontSize: "14px",
    wordBreak: "break-all" as const,
    fontFamily: "monospace",
  },
  address: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: "6px",
    marginTop: "8px",
  },
};

export function DeployButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [connection, setConnection] = useState<WalletConnection | null>(null);
  const [deployProgress, setDeployProgress] = useState<string>("");
  const [result, setResult] = useState<DeploymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    setStatus("connecting");
    setError(null);

    try {
      const conn = await connectWallet();
      setConnection(conn);
      setStatus("connected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
      setStatus("error");
    }
  }, []);

  const handleDeploy = useCallback(async () => {
    if (!connection) return;

    setStatus("deploying");
    setError(null);
    setDeployProgress("Initializing...");

    try {
      const providers = await createProviders(connection.uris, connection.wallet);

      const deployResult = await deployProofOfAuthorship(
        providers,
        connection.address,
        (progress: DeployProgress) => {
          setDeployProgress(progress.message);
        }
      );

      setResult(deployResult);
      setStatus("success");
    } catch (err) {
      console.error("Deployment failed:", err);
      setError(err instanceof Error ? err.message : "Deployment failed");
      setStatus("error");
    }
  }, [connection]);

  const handleDownload = useCallback(() => {
    if (result) {
      downloadDeploymentJson(result);
    }
  }, [result]);

  const walletAvailable = isWalletAvailable();

  return (
    <div style={styles.container}>
      {!walletAvailable && (
        <div style={styles.error}>
          Lace Midnight Preview wallet not detected. Please install the extension and refresh.
        </div>
      )}

      {status === "idle" && (
        <button
          style={{
            ...styles.button,
            ...(walletAvailable ? styles.primaryButton : styles.disabledButton),
          }}
          onClick={handleConnect}
          disabled={!walletAvailable}
        >
          Connect Lace Wallet
        </button>
      )}

      {status === "connecting" && (
        <div style={styles.status}>Connecting to Lace wallet...</div>
      )}

      {status === "connected" && connection && (
        <>
          <div style={styles.address}>
            <span style={styles.label}>Connected:</span>
            <span style={styles.value}>
              {connection.address.slice(0, 20)}...{connection.address.slice(-8)}
            </span>
          </div>
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onClick={handleDeploy}
          >
            Deploy Contract
          </button>
        </>
      )}

      {status === "deploying" && (
        <div style={styles.status}>
          <div style={{ marginBottom: "8px", fontWeight: 600 }}>Deploying...</div>
          <div style={{ color: "#9ca3af" }}>{deployProgress}</div>
        </div>
      )}

      {status === "error" && error && (
        <>
          <div style={styles.error}>{error}</div>
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onClick={() => setStatus("idle")}
          >
            Try Again
          </button>
        </>
      )}

      {status === "success" && result && (
        <div style={styles.success}>
          <h3 style={{ marginBottom: "16px", color: "#22c55e" }}>
            Deployment Successful!
          </h3>

          <div style={styles.resultItem}>
            <div style={styles.label}>Contract Address</div>
            <div style={styles.value}>{result.contractAddress}</div>
          </div>

          <div style={styles.resultItem}>
            <div style={styles.label}>Transaction ID</div>
            <div style={styles.value}>{result.txId}</div>
          </div>

          <div style={styles.resultItem}>
            <div style={styles.label}>Block Height</div>
            <div style={styles.value}>{result.blockHeight}</div>
          </div>

          <div style={styles.resultItem}>
            <div style={styles.label}>Timestamp</div>
            <div style={styles.value}>{result.timestamp}</div>
          </div>

          <div style={styles.resultItem}>
            <div style={styles.label}>Author</div>
            <div style={styles.value}>{result.authorName}</div>
          </div>

          <button
            style={{ ...styles.button, ...styles.secondaryButton, marginTop: "16px" }}
            onClick={handleDownload}
          >
            Download deployment.json
          </button>
        </div>
      )}
    </div>
  );
}
