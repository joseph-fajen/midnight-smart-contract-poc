# CLAUDE.md - Project Rules for Midnight Smart Contract POC

## Project Overview

This is a proof-of-concept smart contract project for the Midnight blockchain. The goal is to deploy a "Proof of Authorship" contract to testnet as a portfolio piece demonstrating technical capability.

**Key Document**: `PRD.md` is the source of truth for requirements.

## Decision-Making

- **Make reasonable choices and document them** - don't ask for permission on small decisions
- Document significant decisions in code comments or in conversation
- For ambiguous requirements, refer to `PRD.md` first, then make a sensible choice
- Only ask for clarification on decisions that could significantly change direction

## Code Style

- **Follow Midnight example patterns** - match the style in official examples and docs
- For Compact (.compact files): follow patterns from `midnight-docs` and example repos
- For TypeScript: follow patterns from Midnight SDK examples
- Keep code clean, readable, and well-organized
- Use correct syntax - no shortcuts that sacrifice correctness

## Git Workflow

- **Do not commit unless explicitly asked**
- When asked to commit, follow standard commit message conventions
- Keep commits atomic and well-described

## Priorities

1. **Speed** - this is a hackathon-style project, move quickly
2. **Quality** - but keep everything impeccable and clean
3. **Correctness** - use proper syntax and patterns, no hacks

Speed and quality are not mutually exclusive here. Write it right the first time.

## Error Handling

When encountering errors or failures:
1. **Try reasonable alternatives first** - don't immediately ask for help
2. Check documentation for solutions
3. Document what was tried and what worked/failed
4. Only ask for guidance after reasonable attempts fail

## Reference Sources

### Local Documentation
- `/Users/josephfajen/git/midnight-docs` - Full Midnight documentation repo

### Online Documentation
- https://docs.midnight.network/ - Main docs
- https://docs.midnight.network/develop/tutorial/building - Build tutorial
- https://docs.midnight.network/sdks - SDK reference
- https://docs.midnight.network/api-reference/compact-runtime - Compact runtime API

### Example Repositories
- https://github.com/midnightntwrk/example-counter - Counter DApp example
- Use `gh` CLI to fetch content from GitHub repos

## Tech Stack

| Component | Version/Details |
|-----------|-----------------|
| Compact | v0.2.0 (smart contract language) |
| Node.js | 20+ |
| TypeScript | Latest |
| Docker | For proof-server |
| Network | Midnight Testnet |

## Project Structure

```
midnight-smart-contract-poc/
├── CLAUDE.md                 # This file - project rules
├── PRD.md                    # Requirements document
├── contracts/
│   └── proof-of-authorship.compact
├── src/
│   └── deploy.ts
├── package.json
├── tsconfig.json
└── deployment.json           # Generated after deployment
```

## Scope Boundaries

### In Scope
- Single Compact smart contract
- One circuit (recordAuthorship)
- Testnet deployment
- CLI-based deployment
- All data public (no selective disclosure complexity)

### Out of Scope
- Frontend/UI
- Multiple contracts
- Complex ZK logic
- Token transfers
- Mainnet deployment
- Private data or selective disclosure

## Contract Specification

The "Proof of Authorship" contract stores:
- `authorName`: "Joseph Fajen"
- `timestamp`: ISO 8601 deployment timestamp
- `contractHash`: SHA-256 hash of contract source
- `statement`: "Deployed by Joseph Fajen as a proof of concept exercise"

All fields are public (use `disclose()` in Compact).

## Testnet Configuration

```
Indexer:     https://indexer.testnet-02.midnight.network/api/v1/graphql
Indexer WS:  wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws
RPC Node:    https://rpc.testnet-02.midnight.network
Proof Server: http://localhost:6300 (Docker)
Faucet:      https://midnight.network/test-faucet/
```

## Common Commands

```bash
# Install Compact compiler
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/download/compact-v0.2.0/compact-installer.sh | sh

# Start proof server
docker run -p 6300:6300 midnightnetwork/proof-server midnight-proof-server

# Compile contract
compact compile contracts/proof-of-authorship.compact contracts/managed/proof-of-authorship

# Build TypeScript
npm run build

# Deploy
npm run deploy
```

## Success Criteria

Deployment is successful when:
1. `deployment.json` exists with a valid contract address
2. Contract state can be queried via the indexer
3. All authorship data is visible on-chain
