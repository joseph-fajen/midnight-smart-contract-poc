# Product Requirements Document: Midnight Proof of Authorship Contract

> **Note**: This PRD was written at project inception based on official Midnight documentation. For actual outcomes and lessons learned, see the [Developer Experience documentation](docs/developer-experience-executive-summary.md).

## Overview

A proof-of-concept smart contract deployed on the Midnight blockchain testnet to demonstrate technical capability in blockchain development. This serves as a portfolio piece showing the ability to write, compile, and deploy a Midnight smart contract.

## Background & Motivation

### Problem Statement

As a technical writer, there is a need to demonstrate hands-on technical capability beyond documentation skills. Deploying a smart contract on a modern blockchain platform provides tangible proof of:

- Understanding blockchain concepts and architecture
- Ability to learn and apply new domain-specific languages
- Capability to work with developer tooling and deployment pipelines
- Practical experience with zero-knowledge proof technology

### Why Midnight?

Midnight is a privacy-focused blockchain built on zero-knowledge proofs, offering:

- **Compact**: A purpose-built smart contract language
- **Privacy by default**: With selective disclosure capabilities
- **Active testnet**: Available for development and experimentation
- **Modern tooling**: TypeScript SDKs, VS Code extensions, CLI tools

## Goals

1. **Primary**: Successfully deploy a smart contract to Midnight testnet
2. **Secondary**: Create verifiable proof of deployment for portfolio purposes
3. **Tertiary**: Document the process for potential blog post or portfolio content

## Success Criteria

| Criterion | Measurement |
|-----------|-------------|
| Contract deployed | Contract address exists on testnet |
| Contract functional | Can read stored data via indexer or CLI |
| Proof captured | deployment.json with address and timestamp |
| Process documented | README or notes capturing the journey |

## Product Specification

### The Contract: "Proof of Authorship"

A simple smart contract that stores authorship information on the Midnight blockchain ledger.

#### Data Fields (All Public)

| Field | Type | Description |
|-------|------|-------------|
| `authorName` | String | "Joseph Fajen" |
| `timestamp` | String | ISO 8601 deployment timestamp |
| `contractHash` | String | SHA-256 hash of the contract source code |
| `statement` | String | "Deployed by Joseph Fajen as a proof of concept exercise" |

#### Circuits (Functions)

| Circuit | Description |
|---------|-------------|
| `recordAuthorship` | Stores all authorship data on the ledger (write) |

All data will be publicly disclosed on the ledger using Compact's `disclose()` operator.

### Verification Methods

After deployment, the contract can be verified through:

1. **deployment.json**: Local file with contract address and timestamp
2. **Indexer Query**: GraphQL query to Midnight testnet indexer
3. **On-chain State**: Reading ledger state to see stored values

## Technical Architecture

### Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Smart Contract | Compact (v0.2.0) | Contract logic |
| Deployment Script | TypeScript | Deploy to testnet |
| Runtime | Node.js 20+ | Execute deployment |
| Proof Generation | Docker (proof-server) | ZK proof generation |
| Wallet | Lace Midnight Preview | Testnet tokens (tDUST) |

### Project Structure

```
midnight-smart-contract-poc/
├── PRD.md                    # This document
├── contracts/
│   └── proof-of-authorship.compact
├── src/
│   └── deploy.ts
├── package.json
├── tsconfig.json
└── deployment.json           # Generated after deployment
```

### Network Configuration

- **Network**: Midnight Testnet
- **Indexer**: https://indexer.testnet-02.midnight.network/api/v1/graphql
- **RPC Node**: https://rpc.testnet-02.midnight.network
- **Proof Server**: localhost:6300 (Docker)
- **Faucet**: https://midnight.network/test-faucet/

## Scope

### In Scope

- Single Compact smart contract
- One circuit (recordAuthorship)
- Testnet deployment
- CLI-based deployment and interaction
- Basic read/write operations
- Process documentation

### Out of Scope

- Frontend/UI
- Multiple contracts or contract interactions
- Complex ZK proof logic or private computations
- Token transfers or DeFi functionality
- Production/mainnet deployment
- Selective disclosure features (all data public for simplicity)

## Dependencies

### Prerequisites

- [ ] Node.js 20+ installed
- [ ] Compact compiler installed
- [ ] Docker Desktop installed and running
- [ ] Lace wallet with testnet tDUST tokens
- [ ] Chrome browser (for Lace wallet)

### External Services

- Midnight Testnet (must be operational)
- Testnet Faucet (for tDUST tokens)
- Midnight Indexer (for verification)

## Deliverables

1. **proof-of-authorship.compact**: The smart contract source code
2. **deploy.ts**: TypeScript deployment script
3. **deployment.json**: Proof of deployment with contract address
4. **README.md**: Setup and deployment instructions (optional)

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Testnet downtime | Low | Check status before starting |
| Faucet rate limits | Medium | Request tokens early |
| Proof server issues | Low | Follow Docker setup carefully |
| Dependency version conflicts | Medium | Use exact versions from docs |

## References

- [Midnight Documentation](https://docs.midnight.network/)
- [Compact Language Reference](https://docs.midnight.network/develop/reference/compact/)
- [Getting Started Guide](https://docs.midnight.network/getting-started/installation)
- [Example Counter Contract](https://github.com/midnightntwrk/example-counter)
- Local docs: `/Users/josephfajen/git/midnight-docs`

---

**Author**: Joseph Fajen
**Created**: 2026-01-23
**Status**: Initial Planning (see [docs/](docs/) for outcomes)
