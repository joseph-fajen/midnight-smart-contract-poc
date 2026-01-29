# Midnight Smart Contract POC: A Developer Experience Journal

I'm a technical writer with deep experience in developer documentation, though I was new to Midnight. In the spirit of a one-day hackathon, I gave myself approximately 8 hours to deploy a simple "Proof of Authorship" contract to Midnight's Preview network, documenting the experience from a newcomer's perspective.

I didn't achieve deployment, but I learned a great deal. The [Executive Summary](docs/developer-experience-executive-summary.md) (3-min read) details what worked, where I got stuck, and observations that may be helpful. The [Full Developer Experience](docs/my-developer-experience.md) provides the complete technical journal.

**Important caveats**:
- This reflects one developer's 8-hour experience, not a comprehensive evaluation
- I may have missed documentation or solutions that would have helped
- The SDK is actively evolving, and some issues may already be addressed

## Where We Left Off

Active research is tracked in the [Compatibility Matrix](docs/compatibility-matrix.md), which documents the version mismatches blocking deployment and next steps. Start there to pick up where we left off.

**TL;DR**: Browser deployment is confirmed impossible with the current toolchain. CLI deployment is experimental. The official [Support Matrix](https://docs.midnight.network/relnotes/support-matrix) lists different SDK versions than we've been using — investigating whether downgrading resolves the issue is the top priority.

## Current Status

| Component | Status |
|-----------|--------|
| Smart Contract | Compiled (24 lines of Compact) |
| CLI Deployment (`src/deploy.ts`) | Initial attempts blocked by network/SDK issues; rewritten for v3, then pivoted to web |
| Web Deployment (`web-deploy/`) | Wallet connects, deploy blocked by runtime version mismatch |
| **Actual Deployment** | **Not achieved** |

## Project Structure

```
midnight-smart-contract-poc/
├── contracts/
│   ├── proof-of-authorship.compact   # Smart contract (24 lines)
│   └── managed/                       # Compiled artifacts
├── src/
│   └── deploy.ts                      # CLI deployment script
├── web-deploy/                        # Browser deployment tool
│   ├── src/
│   │   ├── lib/                       # Wallet, providers, deploy logic
│   │   └── components/                # React UI
│   └── vite.config.ts
├── docs/                              # Developer experience documentation
├── img/                               # Screenshots
├── PRD.md                             # Initial requirements (see docs/ for outcomes)
└── CLAUDE.md                          # Project rules
```

## The Contract

A simple "Proof of Authorship" contract storing four public fields:

```compact
pragma language_version 0.18;

export ledger authorName: Opaque<"string">;
export ledger timestamp: Opaque<"string">;
export ledger contractHash: Bytes<32>;
export ledger statement: Opaque<"string">;

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
```

## Quick Start (If You Want to Try)

### Prerequisites

- Node.js 20+
- Docker Desktop
- Compact compiler (toolchain 0.26.0)
- Lace Midnight Preview browser extension

### CLI Approach

```bash
# Install dependencies
npm install

# Compile contract
npm run compile

# Start proof server (Preview network)
docker run -p 6300:6300 midnightnetwork/proof-server midnight-proof-server --network preview

# Build and deploy
npm run build
npm run deploy
```

### Web Approach

```bash
cd web-deploy
npm install
npm run dev
# Open http://localhost:5173 in Chrome with Lace Midnight Preview
```

## Network Configuration

| Service | Endpoint |
|---------|----------|
| Indexer | https://indexer.preview.midnight.network/api/v3/graphql |
| RPC Node | https://rpc.preview.midnight.network |
| Proof Server | http://localhost:6300 (with `--network preview`) |
| Faucet | https://faucet.preview.midnight.network/ |

**Note**: Lace Midnight Preview uses the Preview network, which differs from testnet-02 referenced in some documentation.

## Author

Joseph Fajen - January 2026
