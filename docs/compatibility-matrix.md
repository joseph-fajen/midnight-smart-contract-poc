# Midnight Preview: Compatibility Matrix

> **Purpose**: Document the complete set of tools, SDKs, and versions required for a working deployment pipeline on Midnight Preview network. This is the document we wish existed in the official docs.
>
> **Status**: In progress — official support matrix found, but key discrepancies remain unresolved.
>
> **Last updated**: January 29, 2026

---

## The Problem

Deploying a Midnight smart contract requires coordination across multiple components:

* a compiler toolchain,
* a contract runtime,
* SDK packages,
* a wallet,
* a proof server, and
* network endpoints.

Each has its own version, and not all combinations work together. We have not found a single source documenting which versions are compatible for the Preview network specifically.

---

## Official Support Matrix (Testnet_02)

On January 29, 2026 we discovered the official [Support Matrix](https://docs.midnight.network/relnotes/support-matrix). It documents the latest tested versions for **Testnet_02**:

| Component | Official Version |
|-----------|-----------------|
| Midnight Node | 0.12.1 |
| Compactc (compiler) | 0.26.0 |
| compact-runtime | 0.9.0 |
| onchain-runtime | 0.3.0 |
| Ledger | 4.0.0 |
| Wallet SDK | 5.0.0 |
| Midnight.js | 2.1.0 |
| DApp Connector API | 3.0.0 |
| Wallet API | 5.0.0 |
| Midnight Lace | 3.0.0 ("devnet-compatible") |
| Midnight Indexer | 2.1.4 |
| db-sync | 13.6.0.5 |
| Ogmios | 6.11.0 |
| Proof Server | 4.0.0 |
| Partner Chains Node | 1.5 |
| Cardano Node | 10.5.3 |

> "This matrix only reflects the latest tested versions. Earlier versions may still work, but we do not guarantee compatibility or provide support for them."

### Key Observations

1. **The matrix targets Testnet_02, not Preview.** Our Lace Midnight Preview wallet connects to `preview.midnight.network` endpoints. It is unclear whether Testnet_02 and Preview are the same network or different.

2. **Midnight.js is listed as 2.1.0.** We have been using `midnight-js-*` packages at `3.0.0-alpha.11`. This is a major version discrepancy — we may have been using the wrong SDK version.

3. **Ledger is listed as 4.0.0.** We have been using `ledger-v6` at `6.1.0-alpha.6`. Another major mismatch.

4. **DApp Connector API is listed as 3.0.0.** We upgraded to v4 based on runtime errors. This may indicate our Lace extension is newer than what the matrix covers.

5. **Lace is listed as 3.0.0 and described as "devnet-compatible."** Our Lace Midnight Preview extension may be a different or newer build.

---

## Our Package Versions vs. Official Matrix

| Component | Official Matrix | Our package.json | Match? |
|-----------|----------------|------------------|--------|
| Compactc | 0.26.0 | 0.26.0 | Yes |
| compact-runtime | 0.9.0 (matrix) / **0.26.x (team says required)** | 0.9.0 | **No** (need 0.26.x, not on npm) |
| Ledger | **4.0.0** | **6.1.0-alpha.6** | No |
| Midnight.js (SDK) | **2.1.0** | **3.0.0-alpha.11** | No |
| DApp Connector API | **3.0.0** | **^3.0.0 (upgraded to v4)** | No |
| Wallet SDK | 5.0.0 | 5.0.0 | Yes |
| Wallet API | 5.0.0 | 5.0.0 | Yes |

The three mismatches (Ledger, Midnight.js, DApp Connector API) could explain our deployment failures. However, the matrix targets Testnet_02, and we are on Preview — so the correct versions for Preview may genuinely differ.

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

## Where Compatibility Breaks

| Component A | Component B | Issue |
|-------------|-------------|-------|
| Compact toolchain 0.26.0 | compact-runtime 0.9.0 | Toolchain produces contracts targeting 0.9.0 |
| compact-runtime 0.9.0 | Browser (Vite) | 0.9.0 is CommonJS; fails with WASM + top-level await in bundler |
| compact-runtime 0.11.0-rc.1 | Contracts from toolchain 0.26.0 | Breaking API changes: `_ChargedState` mismatch, `CompactTypeOpaqueString` changed from class to const |

**The gap**: No known combination of toolchain + runtime that both (a) compiles a valid contract and (b) runs in a browser environment.

---

## Confirmed by Midnight Team (January 28–29, 2026)

Via Discord, multiple Midnight representatives confirmed the following:

### compact-runtime must match toolchain version (0.26.x)

> "The compatibility matrix in Midnight Docs specifies that @midnight-ntwrk/compact-runtime must be on the same major/minor version (0.26.x) as the compiler." — Midnight Network Team, Jan 29

This means we need compact-runtime 0.26.x to match toolchain 0.26.0. However, **no 0.26.x version exists on npm**. As of January 29, 2026, the highest published version is 0.14.0. The full list of published versions:

```
0.6.12, 0.6.13, 0.7.0, 0.7.1, 0.8.1, 0.9.0, 0.11.0-rc.1, 0.14.0-rc.0, 0.14.0
```

This means we cannot currently obtain the correct runtime version through the public npm registry. It may be unreleased, available through a private registry, or the team's guidance may refer to an internal version numbering.

### Browser (ESM) deployment is not supported

> "Browser (ESM) support: At present, the runtime is not yet packaged for direct browser execution. Developers attempting ESM builds report failures or incomplete support." — Midnight Network Team, Jan 29

This confirms what we discovered empirically: no compact-runtime version works in a browser environment. This is now confirmed by two separate Midnight representatives.

### CLI deployment path exists but requires setup

> "There is a working CLI deployment path that will work perfectly, but you will firstly have to go through the interface process to generate an encrypted node to have that operated on Dapps." — MadisonDev (DEV), Jan 29

The "interface process to generate an encrypted node" is not documented in any material we've found. This may refer to a node setup step beyond what the current tutorials cover.

### Lace sync — hardware wallet recommended

> "Using a hardware wallet in combination with Lace can help resolve these syncing problems because the hardware wallet manages your keys securely and handles transaction signing more efficiently, which can improve the connection and synchronization process." — Midnight Network Support, Jan 28

Official support maintains that a hardware wallet with Cardano (ADA) staking history helps Lace sync. We remain skeptical — Lace Midnight Preview syncs with the Midnight blockchain indexer, not the Cardano chain — but this is the official position from two separate support interactions.

---

## What We Need Answered

### Answered (partially)

1. ~~**What compact-runtime version is compatible with toolchain 0.26.0?**~~ **Answered**: Must be 0.26.x, but no 0.26.x version is published on npm. **New question**: Where do we obtain compact-runtime 0.26.x?

2. ~~**Is browser deployment possible?**~~ **Answered**: No. Runtime is not packaged for browser/ESM execution. Confirmed by two Midnight reps.

3. ~~**Is there a working CLI deployment path?**~~ **Answered**: Yes, but requires an "interface process to generate an encrypted node." **New question**: What is this process and where is it documented?

4. ~~**Why is Lace stuck at 0% sync?**~~ **Partially answered**: Official support recommends a hardware wallet with Cardano staking history. We consider this explanation unlikely but have not been able to test it.

### Still Open

5. **Are Testnet_02 and Preview the same network?** The official support matrix targets Testnet_02. Our Lace wallet and endpoints use Preview (`preview.midnight.network`). If these are different networks, the matrix versions may not apply.

6. **Should we use Midnight.js 2.1.0 instead of 3.0.0-alpha.11?** The matrix lists 2.1.0. We used 3.0.0-alpha.11 based on npm availability and what appeared to be the latest.

7. **Where is compact-runtime 0.26.x?** The Midnight team says it must match the compiler at 0.26.x, but the highest version on npm is 0.14.0. Is it available through a private registry, or is it unreleased?

8. **What is the "encrypted node" generation process?** MadisonDev says CLI deployment requires this but provided no documentation link.

See [discord-questions-2026-01-28.md](./discord-questions-2026-01-28.md) for earlier questions posed to the Midnight team.

---

## Next Steps

1. **Find compact-runtime 0.26.x.** The Midnight team says this version is required but it's not on npm. Ask on Discord where to obtain it, or check if there's a private/scoped npm registry.

2. **Clarify the "encrypted node" setup for CLI deployment.** MadisonDev confirmed CLI works but mentioned a prerequisite step. Get documentation or instructions for this process.

3. **Clarify Testnet_02 vs. Preview.** Still unanswered. If they are the same network, the official support matrix versions apply directly.

4. **Try the official matrix versions on the CLI path** once we have the correct compact-runtime. Downgrade `package.json` to Midnight.js 2.1.0, Ledger 4.0.0, and compact-runtime 0.26.x.

---

## Key Learnings (January 29, 2026 session)

1. **Browser deployment is confirmed impossible** with the current toolchain (0.26.0). Runtime is not packaged for browser/ESM execution. Confirmed by two separate Midnight representatives.

2. **We have been using the wrong compact-runtime version.** The Midnight team states compact-runtime must be 0.26.x to match toolchain 0.26.0. We used 0.9.0. However, no 0.26.x version exists on npm — the highest published is 0.14.0.

3. **CLI deployment is confirmed viable** by MadisonDev (DEV role), but requires an undocumented "encrypted node" generation step.

4. **We may have been using the wrong SDK versions.** The official support matrix lists Midnight.js 2.1.0 and Ledger 4.0.0; we used 3.0.0-alpha.11 and 6.1.0-alpha.6 respectively. These are major version discrepancies that could explain deployment failures.

5. **Lace Midnight Preview wallet is stuck at 0% sync** as of January 29, 2026. Official support recommends a hardware wallet with Cardano staking history. We remain skeptical but have not tested this.

6. **Some Discord support responses were not applicable.** The suggested "Developer tab" does not exist in Lace Midnight Preview.

---

## References

- [Official Support Matrix](https://docs.midnight.network/relnotes/support-matrix) (Testnet_02)
- [Developer Experience Executive Summary](./developer-experience-executive-summary.md)
- [Full Developer Experience Journal](./my-developer-experience.md)
- [Discord Questions](./discord-questions-2026-01-28.md)
- [Midnight Docs](https://docs.midnight.network/)
