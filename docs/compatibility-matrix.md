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
| compact-runtime | 0.9.0 | 0.9.0 | Yes |
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

## Confirmed by Midnight Team (January 29, 2026)

Via Discord, a Midnight representative confirmed the following:

### Browser deployment is not currently possible with toolchain 0.26.0

> There is currently no runtime version that both matches the compiled contract output from toolchain 0.26.0 and works in a browser environment as ESM.

The two options are: (a) stick to Node.js environments, or (b) upgrade contract compilation to target the newer runtime API, adapting to the breaking changes. Neither option has a documented path.

### CLI deployment on Preview is experimental

> The CLI deployment path using `@midnight-ntwrk/wallet` v5.0.0 and `midnight-js` SDK v3.0.0-alpha.11 is "somewhat experimental on Preview." There isn't a fully stable, officially supported combination documented yet.

The suggestion was to align wallet SDK and contracts SDK versions more closely, "often by downgrading or using specific alpha versions that match internal API expectations" — but no specific versions were provided.

### Lace sync issue unresolved

The Midnight rep suggested the 0% sync issue could be related to not having a hardware wallet with Cardano staking history. We consider this unlikely — Lace Midnight Preview syncs with the Midnight blockchain indexer, which is independent of Cardano staking activity. The sync failure more likely indicates a Preview network infrastructure issue or an extension bug.

---

## What We Need Answered

1. **Are Testnet_02 and Preview the same network?** The official support matrix targets Testnet_02. Our Lace wallet and endpoints use Preview (`preview.midnight.network`). If these are different networks, the matrix versions may not apply.

2. **Should we use Midnight.js 2.1.0 instead of 3.0.0-alpha.11?** The matrix lists 2.1.0. We used 3.0.0-alpha.11 based on npm availability and what appeared to be the latest. If 2.1.0 is correct, our entire SDK layer needs to be downgraded.

3. **Should we use Ledger 4.0.0 instead of 6.1.0-alpha.6?** Same question — the matrix says 4.0.0 but we used a much newer alpha.

4. **What specific alpha versions of the SDK should be used together for CLI deployment on Preview?** The Midnight team acknowledged version alignment is needed but did not specify which versions.

5. **Why is Lace Midnight Preview stuck at 0% sync?** As of January 29, 2026, the wallet will not sync. This blocks any browser-based deployment path regardless of version compatibility.

See [discord-questions-2026-01-28.md](./discord-questions-2026-01-28.md) for earlier questions posed to the Midnight team.

---

## Next Steps

1. **Clarify Testnet_02 vs. Preview.** This is the highest-priority question. If they are the same network, downgrading to the official support matrix versions (Midnight.js 2.1.0, Ledger 4.0.0, DApp Connector API 3.0.0) is the obvious next move. Ask on Discord.

2. **Try the official matrix versions on the CLI path.** If Testnet_02 and Preview are confirmed to be the same (or close enough), downgrade `package.json` to match the support matrix and attempt CLI deployment. This bypasses the browser/ESM blocker entirely.

3. **Monitor Lace wallet sync.** Check back periodically — if it starts syncing, the Preview network is healthy. If it remains stuck, report it as a separate issue on Discord.

4. **Follow up on Discord with specific version question.** Ask whether anyone has successfully deployed a contract on Preview recently, and if so, what exact package versions they used.

---

## Key Learnings (January 29, 2026 session)

1. **Browser deployment is confirmed impossible** with the current toolchain (0.26.0). No compact-runtime version both matches toolchain 0.26.0 output and works as ESM in a browser. Confirmed by Midnight rep.

2. **CLI deployment is acknowledged as experimental** on Preview, with no documented stable version combination.

3. **We may have been using the wrong SDK versions.** The official support matrix lists Midnight.js 2.1.0 and Ledger 4.0.0; we used 3.0.0-alpha.11 and 6.1.0-alpha.6 respectively. These are major version discrepancies that could explain deployment failures.

4. **Lace Midnight Preview wallet is stuck at 0% sync** as of January 29, 2026. Cause unknown — blocks any browser-based deployment regardless of version compatibility.

5. **Some Discord support responses were not applicable.** The suggested "Developer tab" does not exist in Lace Midnight Preview. The "hardware wallet with Cardano staking history" suggestion for sync issues is technically unlikely to be relevant.

---

## References

- [Official Support Matrix](https://docs.midnight.network/relnotes/support-matrix) (Testnet_02)
- [Developer Experience Executive Summary](./developer-experience-executive-summary.md)
- [Full Developer Experience Journal](./my-developer-experience.md)
- [Discord Questions](./discord-questions-2026-01-28.md)
- [Midnight Docs](https://docs.midnight.network/)
