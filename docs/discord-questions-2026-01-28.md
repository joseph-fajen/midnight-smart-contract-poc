# Discord Follow-Up Questions — January 28–29, 2026

## Context

8-hour hackathon attempt to deploy a 24-line Proof of Authorship contract to Midnight Preview. Everything worked (compile, wallet connect, providers) except the final deployment step due to runtime version mismatch.

## Question 1: Browser Deployment Version Matrix

> I got a Proof of Authorship contract compiled (toolchain 0.26.0), Lace wallet connected, and all providers configured on Preview. Deployment fails with `expected instance of _ChargedState` because toolchain 0.26.0 produces contracts for compact-runtime 0.9.0 (CJS), but browser/Vite requires 0.11.0-rc.1 (ESM) which has breaking API changes. **What is the correct set of package versions for deploying a compiled contract to Preview from a browser today?**

## Question 2: CLI Fallback

> **Alternatively, is there a working CLI deployment path using a standalone wallet seed (no Lace) on Preview?**

## Status

- [x] Question 1 asked
- [x] Question 1 answered — **Browser deployment is not currently possible with toolchain 0.26.0.** No runtime version both matches toolchain 0.26.0 contract output and works as ESM in a browser. Options are: stick to Node.js, or recompile for the newer runtime (no documented path).
- [x] Question 2 asked
- [x] Question 2 answered — **CLI deployment on Preview is "somewhat experimental."** No fully stable, officially supported version combination is documented. The suggestion is to align wallet SDK and contracts SDK versions more closely, but no specific versions were provided.

## Additional Findings (January 29, 2026)

### Official Support Matrix Discovered

The official [Support Matrix](https://docs.midnight.network/relnotes/support-matrix) documents tested versions for **Testnet_02** (not Preview). Key version discrepancies with our setup:

| Component | Official Matrix | Our Version |
|-----------|----------------|-------------|
| Midnight.js (SDK) | 2.1.0 | 3.0.0-alpha.11 |
| Ledger | 4.0.0 | 6.1.0-alpha.6 |
| DApp Connector API | 3.0.0 | v4 |

It remains unclear whether Testnet_02 and Preview are the same network.

### Lace Wallet Sync Issue

Lace Midnight Preview is stuck at 0% sync as of January 29, 2026. The Midnight rep suggested this could be related to not having a hardware wallet with Cardano staking history. We consider this unlikely — Lace syncs with Midnight's indexer, not Cardano staking infrastructure. More likely a network issue or extension bug.

### No Developer Tab in Lace

A Midnight rep suggested checking the "Developer tab" in Lace for package dependency versions. No such tab exists in Lace Midnight Preview (confirmed via screenshots of the full Settings page).

## Open Questions for Next Session

1. Are Testnet_02 and Preview the same network?
2. Should we use Midnight.js 2.1.0 and Ledger 4.0.0 (per official matrix) instead of our current versions?
3. What specific alpha versions work together for CLI deployment on Preview?
