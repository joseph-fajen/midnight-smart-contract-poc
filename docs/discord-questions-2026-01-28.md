# Discord Questions & Answers — January 28–29, 2026

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

---

## Additional Answers (January 29, 2026 — later in the day)

Three more responses came in from two different sources.

### compact-runtime must be 0.26.x (Midnight Network Team, 8:04 AM)

Responding to our Question 1, the Midnight Network Team stated:

> 1. Compact-runtime Compatibility with Toolchain 0.26.0
> 2. Toolchain 0.26.0 requires matching runtime libraries to avoid version mismatch errors.
> 3. The compatibility matrix in Midnight Docs specifies that @midnight-ntwrk/compact-runtime must be on the same major/minor version (0.26.x) as the compiler.
> 4. Browser (ESM) support: At present, the runtime is not yet packaged for direct browser execution. Developers attempting ESM builds report failures or incomplete support.

**Our analysis**: This introduces a contradiction. The official support matrix lists compact-runtime 0.9.0, but this response says it must be 0.26.x. No 0.26.x version exists on the public npm registry — the highest published version is 0.14.0. Either 0.26.x is unreleased, available through a private registry, or the guidance is incorrect.

### CLI path confirmed (MadisonDev, DEV role, 1:19 PM)

> There is a working CLI deployment path that will work perfectly, but you will firstly have to go through the interface process to generate an encrypted node to have that operated on Dapps.

**Our analysis**: This upgrades CLI from "somewhat experimental" to "will work perfectly," which is encouraging. The prerequisite — an "interface process to generate an encrypted node" — is not documented in any material we've found.

### Lace sync — hardware wallet (Midnight Network Support, 6:56 PM)

> The syncing issue with Lace Midnight Preview sometimes happens because Lace can find it difficult to properly integrate or "fit in" with certain setups. That's why I asked if you've deployed a hardware wallet along with your setup. Using a hardware wallet in combination with Lace can help resolve these syncing problems because the hardware wallet manages your keys securely and handles transaction signing more efficiently, which can improve the connection and synchronization process.
>
> Typically, a hardware wallet that has been used for Cardano (ADA) transactions or activity — especially one that has been staking to an ADA pool for a long time — has a more stable and recognized state on the network. [...] If you haven't set up a hardware wallet yet, I'd recommend trying that alongside Lace to see if it improves your syncing experience.

**Our analysis**: This is the official position from a second interaction. We remain skeptical that Cardano staking history affects Midnight blockchain indexer sync, but we have not tested it. This is a non-blocking issue since browser deployment is impossible regardless.

---

## Open Questions for Next Session

### Priority 1 — Blocking deployment

1. **Where is compact-runtime 0.26.x?** The Midnight Network Team says it must match the compiler at 0.26.x, but the highest version on npm is 0.14.0. Is it available through a private registry, or is it unreleased?

2. **What is the "encrypted node" generation process?** MadisonDev says CLI deployment requires going through an "interface process to generate an encrypted node." Where is this documented?

### Priority 2 — Clarification

3. **Are Testnet_02 and Preview the same network?** The official support matrix targets Testnet_02. Our endpoints use Preview (`preview.midnight.network`).

4. **Should we use Midnight.js 2.1.0 and Ledger 4.0.0** (per official matrix) instead of 3.0.0-alpha.11 and 6.1.0-alpha.6?

5. **Why does the official support matrix list compact-runtime 0.9.0** while the Midnight Network Team says it must be 0.26.x? Which is correct?

---

## Security Note: Discord Scams

> **Exercise caution when seeking help on Discord.** Scammers impersonate "Midnight Support" to target developers who are troubleshooting issues. Legitimate Midnight support will never ask you to enter seed phrases, connect funded wallets to third-party sites, or join private voice calls. If anyone directs you to a website to "restore" or "connect" your wallet, it is a scam.

The interactions with Midnight Network Team and Midnight Network Support documented above appear to be from legitimate team members responding in official channels. The technical information they provided (compact-runtime versioning, browser ESM limitations) is consistent with our own findings and with official documentation.
