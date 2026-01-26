# Developer Experience Journal: Executive Summary

**Project**: Deploy a 24-line "Proof of Authorship" smart contract to Midnight Preview network
**Time invested**: 8+ hours
**Outcome**: Deployment not achieved
**Date**: January 2026

*For detailed technical analysis, see [my-developer-experience.md](./my-developer-experience.md)*

---

## About This Document

This summarizes one developer's experience attempting to deploy a simple smart contract to Midnight. I'm sharing this in the spirit of helpfulness, recognizing that:

- This reflects a single 8-hour experience, not a comprehensive evaluation
- I may have missed documentation or solutions that would have helped
- The SDK is actively evolving, and some challenges may already be addressed
- The team has context and priorities I'm not aware of

I approached this project with genuine enthusiasm for Midnight's technology and want to offer these observations in case they're useful.

---

## What I Found Impressive

Before discussing challenges, I want to highlight what works well:

- **The Compact language and compiler** worked smoothly - I encountered no obstacles there
- **The ZK technology** is what drew me to Midnight - I'm fascinated by its promise
- **Discord community** was responsive and helpful
- **Core infrastructure** (indexer, RPC, proof server, wallet) all functioned correctly
- **Active development** - the SDK is clearly evolving

---

## What Worked

| Component | Status |
|-----------|--------|
| Contract compilation (Compact toolchain 0.26.0) | ✅ |
| Preview network connectivity (indexer, RPC) | ✅ |
| Proof server with `--network preview` | ✅ |
| Lace wallet connection (DApp Connector API v4) | ✅ |
| Wallet funding via Preview faucet | ✅ |

### Web App Successfully Connected to Lace Wallet

![Web app connected to Lace wallet](../img/web-app-connected.png)

*The web deployment tool connects successfully, retrieves wallet addresses, and is ready to deploy - but deployment fails due to runtime version mismatch.*

---

## Where I Got Stuck

### 1. Network Discovery

The getting-started documentation references **testnet-02**, which returned 503 errors when I tried it. Through Discord, I learned that Lace Midnight Preview uses the **Preview network** - a different network requiring different SDK packages.

**My experience**: Several hours spent before understanding the network distinction.

### 2. SDK Version Coordination

| Component | Version | What I Observed |
|-----------|---------|-----------------|
| Compact toolchain | 0.26.0 (latest) | Produces contracts for runtime 0.9.0 |
| compact-runtime 0.9.0 | CommonJS | Failed in Vite (WASM + top-level await) |
| compact-runtime 0.11.0-rc.1 | ESM | Breaking API changes from 0.9.0 |

**The challenge I couldn't resolve**: Browser deployment seemed to require ESM (0.11.0), but my contract required the 0.9.0 runtime. I couldn't find a compatible configuration.

### 3. API Changes Between Runtime Versions

Between compact-runtime 0.9.0 and 0.11.0-rc.1, I observed:
- `CompactTypeOpaqueString` changed from class to const
- `CompactTypeBoolean` changed from class to const
- `ContractState` internal structure changed
- `ChargedState` type checking added

My contract compiled for 0.9.0 couldn't run on 0.11.0-rc.1.

### The Final Error

![ChargedState error blocking deployment](../img/web-app-chargedstate-error.png)

*When clicking "Deploy Contract", the runtime version mismatch causes `expected instance of _ChargedState` error.*

### 4. No Upgrade Path I Could Find

```bash
compact list        # Shows 0.26.0 as latest
compact update 0.27.0  # "Couldn't find specified version"
```

I couldn't find a newer Compact compiler that might produce contracts for the 0.11.0 runtime. There may be one I missed.

---

## Documentation Observations

Areas where I encountered friction (there may be solutions I didn't find):

| Observation | My Experience |
|-------------|---------------|
| Network guidance | I initially targeted testnet-02 before learning Preview is current |
| SDK versions in getting-started | The versions I found led to Lace incompatibility |
| Toolchain ↔ runtime coordination | I spent significant time on version mismatches |
| Browser deployment | I couldn't find guidance for Vite/Webpack |
| DApp Connector API v4 | I found it differs from v3; had to experiment |
| Migration guide discoverability | I found it late in my process |
| `create-mn-app` scaffolding | Tested post-hoc; generates testnet-02 config (same challenges) |

---

## Questions That Would Have Helped Me

If I had asked these questions at the start, it might have saved significant time:

1. **"Which version of compact-runtime is compatible with contracts compiled by Compact toolchain 0.26.0?"**

2. **"How do I deploy a Midnight smart contract from a browser using Vite?"**

3. **"I'm a new developer starting today. Should I use testnet-02 or Preview network?"**

---

## Observations That May Be Helpful

Based on my experience, these are areas where guidance would have helped me. The team may already be aware of these or working on solutions:

**Areas where I encountered friction:**

1. **Network clarity** - Guidance on which network to target would have saved me time
2. **Version coordination** - A compatibility matrix (toolchain → runtime → network) would have helped
3. **Browser deployment** - Guidance for Vite/Webpack configuration
4. **Module format** - The CommonJS runtime didn't work with modern bundlers in my testing
5. **DApp Connector API** - Notes on v4 changes from v3

I offer these observations humbly - documentation is challenging, especially for rapidly evolving projects, and there may be solutions I simply didn't find.

---

## Time Investment Breakdown

| Activity | Time |
|----------|------|
| Contract development | 30 min |
| Initial deploy script | 30 min |
| Debugging testnet-02 503 errors | 1 hour |
| Discovering Preview vs testnet-02 | 1 hour |
| Wallet/seed derivation research | 1.5 hours |
| SDK version research and upgrade | 1.5 hours |
| Building web deployment tool | 1 hour |
| Documentation | 1 hour |
| **Total** | **~8 hours** |

---

## Closing Thoughts

In my experience, most of the 8 hours was spent on SDK and configuration challenges rather than the contract itself. The technology underlying Midnight is exciting to me, and I found the Discord community genuinely helpful.

I'm sharing this experience in case it's useful. As someone who works in developer documentation, I understand how difficult it is to keep docs current with rapidly evolving software. I hope these observations from a newcomer's perspective might provide a helpful data point.

---

*Full technical details: [my-developer-experience.md](./my-developer-experience.md) (1600+ lines)*
