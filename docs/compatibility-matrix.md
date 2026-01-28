# Midnight Preview: Compatibility Matrix

> **Purpose**: Document the complete set of tools, SDKs, and versions required for a working deployment pipeline on Midnight Preview network. This is the document we wish existed in the official docs.
>
> **Status**: Incomplete — awaiting confirmation from Midnight team on key version questions.
>
> **Last updated**: January 28, 2026

---

## The Problem

Deploying a Midnight smart contract requires coordination across multiple components: 

* a compiler toolchain, 
* a contract runtime, 
* SDK packages, 
* a wallet, 
* a proof server, and 
* network endpoints. 

Each has its own version, and not all combinations work together. We have not found a single source documenting which versions are compatible.

---

## What We Know Works (Individually)

| Component | Version | Status |
|-----------|---------|--------|
| Compact compiler | toolchain 0.26.0, language v0.2.0 | Compiles successfully |
| Proof server | `midnightnetwork/proof-server` with `--network preview` | Connects and responds |
| Lace Midnight Preview | Browser extension | Connects, provides addresses, funds via faucet |
| DApp Connector API | v4 | Wallet connection works |
| Preview network indexer | `indexer.preview.midnight.network/api/v3/graphql` | Responds correctly |
| Preview network RPC | `rpc.preview.midnight.network` | Responds correctly |

## What We Know Works Together

| Component | Version | Compatible With |
|-----------|---------|-----------------|
| Midnight JS SDK packages | 3.0.0-alpha.11 | Preview network (confirmed by Midnight team) |
| Wallet SDK | 5.0.0 | Preview network |
| Ledger | 6.1.0-alpha.6 | Preview network |

## Where Compatibility Breaks

| Component A | Component B | Issue |
|-------------|-------------|-------|
| Compact toolchain 0.26.0 | compact-runtime 0.9.0 | Toolchain produces contracts targeting 0.9.0 |
| compact-runtime 0.9.0 | Browser (Vite) | 0.9.0 is CommonJS; fails with WASM + top-level await in bundler |
| compact-runtime 0.11.0-rc.1 | Contracts from toolchain 0.26.0 | Breaking API changes: `_ChargedState` mismatch, `CompactTypeOpaqueString` changed from class to const |

**The gap**: No known combination of toolchain + runtime that both (a) compiles a valid contract and (b) runs in a browser environment.

---

## What We Need Answered

1. **What version of compact-runtime is compatible with contracts compiled by toolchain 0.26.0 AND works in a browser (ESM)?**

2. **If browser deployment isn't supported yet, is there a working CLI deployment path on Preview using a standalone wallet seed (no Lace)?**

See [discord-questions-2026-01-28.md](./discord-questions-2026-01-28.md) for the exact questions posed to the Midnight team.

---

## Target: Complete Working Stack

Once confirmed, this is the full stack we aim to document:

| Layer | Component | Version | Notes |
|-------|-----------|---------|-------|
| **Language** | Compact | ? | |
| **Toolchain** | Compact compiler | ? | |
| **Runtime** | compact-runtime | ? | Must match compiled contract |
| **SDK** | midnight-js-contracts | ? | |
| | midnight-js-http-client-proof-provider | ? | |
| | midnight-js-indexer-public-data-provider | ? | |
| | midnight-js-types | ? | |
| | midnight-js-network-id | ? | |
| **Wallet** | wallet / wallet-api | ? | |
| | wallet-sdk-facade | ? | |
| **Ledger** | ledger | ? | |
| **ZK** | zswap | ? | |
| **Infra** | Proof server Docker image | ? | |
| **Network** | Target network | Preview | |
| **Browser** | DApp Connector API | ? | If browser deployment |
| **Bundler** | Vite / Webpack | ? | If browser deployment |

---

## References

- [Developer Experience Executive Summary](./developer-experience-executive-summary.md)
- [Full Developer Experience Journal](./my-developer-experience.md)
- [Discord Questions](./discord-questions-2026-01-28.md)
- [Midnight Docs](https://docs.midnight.network/)
