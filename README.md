# Proof of Authorship - Midnight Smart Contract

A proof-of-concept smart contract deployed on the Midnight blockchain testnet. This project demonstrates the ability to write, compile, and deploy a Midnight smart contract using zero-knowledge proof technology.

## What This Demonstrates

- Writing smart contracts in Compact (Midnight's DSL)
- Using the Midnight SDK for TypeScript-based deployment
- Working with ZK proof generation via the proof server
- Interacting with Midnight's testnet infrastructure

## Prerequisites

- Node.js 20+
- Docker Desktop (for the proof server)
- Compact compiler (`compact --version` should return 0.2.0+)

### Installing the Compact Compiler

```bash
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/midnightntwrk/compact/releases/download/compact-v0.2.0/compact-installer.sh | sh

# Then install/update the toolchain
compact update 0.26.0
```

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Compile the contract

```bash
npm run compile
```

### 3. Build the TypeScript

```bash
npm run build
```

### 4. Start the proof server

In a separate terminal:

```bash
docker run -p 6300:6300 midnightnetwork/proof-server -- 'midnight-proof-server --network testnet'
```

### 5. Deploy

```bash
npm run deploy
```

The script will:
- Generate a new wallet seed (or accept an existing one)
- Display your wallet address for funding
- Wait for you to fund the wallet via the [testnet faucet](https://midnight.network/test-faucet)
- Deploy the contract
- Call `recordAuthorship` to store the authorship data on-chain
- Save deployment details to `deployment.json`

## Verification

After deployment, verify the contract state:

1. Check `deployment.json` for the contract address
2. Query the Midnight indexer at `https://indexer.testnet-02.midnight.network/api/v1/graphql`

Example GraphQL query:
```graphql
query {
  contractState(address: "<CONTRACT_ADDRESS>") {
    address
    data
  }
}
```

## Contract Details

The contract stores four public fields:

| Field | Description |
|-------|-------------|
| `authorName` | "Joseph Fajen" |
| `timestamp` | ISO 8601 deployment timestamp |
| `contractHash` | SHA-256 hash of the contract source |
| `statement` | "Deployed by Joseph Fajen as a proof of concept exercise" |

See [PRD.md](PRD.md) for full requirements and background.

## Project Structure

```
├── contracts/
│   └── proof-of-authorship.compact   # Smart contract source
├── src/
│   └── deploy.ts                     # Deployment script
├── package.json
├── tsconfig.json
├── PRD.md                            # Product requirements
└── deployment.json                   # Generated after deployment
```

## Network Configuration

| Service | Endpoint |
|---------|----------|
| Indexer | https://indexer.testnet-02.midnight.network/api/v1/graphql |
| RPC Node | https://rpc.testnet-02.midnight.network |
| Proof Server | http://localhost:6300 |
| Faucet | https://midnight.network/test-faucet |
