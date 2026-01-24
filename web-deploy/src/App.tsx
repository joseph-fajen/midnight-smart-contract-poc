import { DeployButton } from "./components/DeployButton";

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
  },
  content: {
    maxWidth: "600px",
    width: "100%",
  },
  header: {
    textAlign: "center" as const,
    marginBottom: "32px",
  },
  title: {
    fontSize: "28px",
    fontWeight: 700,
    marginBottom: "8px",
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  subtitle: {
    fontSize: "16px",
    color: "#9ca3af",
    marginBottom: "24px",
  },
  description: {
    fontSize: "14px",
    color: "#6b7280",
    lineHeight: 1.6,
    marginBottom: "32px",
    padding: "16px",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  prerequisites: {
    marginTop: "32px",
    padding: "16px",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  prereqTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#9ca3af",
    marginBottom: "12px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  prereqList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  prereqItem: {
    fontSize: "14px",
    color: "#6b7280",
    marginBottom: "8px",
    paddingLeft: "20px",
    position: "relative" as const,
  },
  footer: {
    marginTop: "40px",
    textAlign: "center" as const,
    fontSize: "12px",
    color: "#4b5563",
  },
  link: {
    color: "#6366f1",
    textDecoration: "none",
  },
};

function App() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <header style={styles.header}>
          <h1 style={styles.title}>Proof of Authorship</h1>
          <p style={styles.subtitle}>Midnight Preview Network</p>
        </header>

        <div style={styles.description}>
          Deploy a smart contract that permanently records authorship information on the
          Midnight blockchain. This tool connects to your Lace Midnight Preview wallet
          and deploys the pre-compiled contract to the Preview network.
        </div>

        <DeployButton />

        <div style={styles.prerequisites}>
          <h3 style={styles.prereqTitle}>Prerequisites</h3>
          <ul style={styles.prereqList}>
            <li style={styles.prereqItem}>
              <span style={{ position: "absolute", left: 0 }}>1.</span>
              Lace Midnight Preview browser extension installed
            </li>
            <li style={styles.prereqItem}>
              <span style={{ position: "absolute", left: 0 }}>2.</span>
              Wallet funded with tDUST tokens from the Preview faucet
            </li>
            <li style={styles.prereqItem}>
              <span style={{ position: "absolute", left: 0 }}>3.</span>
              Proof server running locally (docker run -p 6300:6300 midnightnetwork/proof-server midnight-proof-server --network preview)
            </li>
          </ul>
        </div>

        <footer style={styles.footer}>
          <p>
            View source on{" "}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.link}
            >
              GitHub
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
