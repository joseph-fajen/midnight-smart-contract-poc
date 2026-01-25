# Developer Experience Report: Executive Summary

**Project**: Deploy a 24-line "Proof of Authorship" smart contract to Midnight Preview network
**Time invested**: 8+ hours
**Outcome**: Deployment not achieved
**Date**: January 2026

*For detailed technical analysis, see [my-developer-experience.md](./my-developer-experience.md)*

---

## Bottom Line

A simple smart contract deployment that should take 1-2 hours took 8+ hours and was **never completed** due to SDK version incompatibilities and documentation gaps.

The contract itself took 30 minutes to write. The remaining 7.5+ hours were spent debugging network configuration, SDK versions, and bundler incompatibilities.

---

## What Worked

| Component | Status |
|-----------|--------|
| Contract compilation (Compact toolchain 0.26.0) | ✅ |
| Preview network connectivity (indexer, RPC) | ✅ |
| Proof server with `--network preview` | ✅ |
| Lace wallet connection (DApp Connector API v4) | ✅ |
| Wallet funding via Preview faucet | ✅ |

---

## What Blocked Deployment

### 1. Documentation Points to Deprecated Network

The getting-started documentation references **testnet-02**, which returns 503 errors. The Lace Midnight Preview wallet uses the **Preview network** - a completely different network requiring different SDK packages.

**Impact**: Hours spent debugging before discovering networks are different.

### 2. SDK Version Matrix Incompatibility

| Component | Version | Issue |
|-----------|---------|-------|
| Compact toolchain | 0.26.0 (latest) | Produces contracts for runtime 0.9.0 |
| compact-runtime 0.9.0 | CommonJS | Fails in Vite (WASM + top-level await) |
| compact-runtime 0.11.0-rc.1 | ESM | Breaking API changes, incompatible with 0.26.0 contracts |

**The dilemma**: Browser deployment requires ESM (0.11.0), but the contract requires CommonJS runtime (0.9.0). No solution exists.

### 3. Breaking API Changes Between Runtime Versions

Between compact-runtime 0.9.0 and 0.11.0-rc.1:
- `CompactTypeOpaqueString` changed from class to const
- `CompactTypeBoolean` changed from class to const
- `ContractState` internal structure changed
- `ChargedState` type checking added

Contracts compiled for 0.9.0 **cannot run** on 0.11.0-rc.1.

### 4. No Upgrade Path Available

```bash
compact list        # Shows 0.26.0 as latest
compact update 0.27.0  # "Couldn't find specified version"
```

No newer Compact compiler exists that produces contracts compatible with the ESM runtime.

---

## Documentation Gaps Identified

| Gap | Impact |
|-----|--------|
| No "which network to use" guidance | Hours on wrong network |
| Getting-started uses v2.x SDK (deprecated) | Incompatible with Lace wallet |
| No Compact toolchain ↔ runtime version matrix | Hours debugging version mismatches |
| No browser deployment guide | Blocked entirely by bundler issues |
| DApp Connector API v4 undocumented | Had to reverse-engineer from Lace |
| Migration guide not linked from getting-started | Discovered late in process |

---

## Top 3 Questions for Documentation Team

These questions would surface critical missing information:

1. **"Which version of compact-runtime is compatible with contracts compiled by Compact toolchain 0.26.0?"**

2. **"How do I deploy a Midnight smart contract from a browser using Vite?"**

3. **"I'm a new developer starting today. Should I use testnet-02 or Preview network?"**

---

## Recommendations

### Critical (Blocking developers now)

1. **Update getting-started docs** to use Preview network and v3.0.0-alpha SDK packages
2. **Publish SDK version compatibility matrix** (toolchain → runtime → network)
3. **Add prominent warning** that testnet-02 is deprecated

### High Priority

4. **Publish ESM-only runtime packages** (CommonJS breaks modern bundlers)
5. **Create browser deployment guide** for Vite/Webpack
6. **Document DApp Connector API v4** (significantly different from v3)

### Medium Priority

7. **Consider runtime version warnings** instead of hard errors
8. **Provide pre-bundled browser package** for compact-runtime

---

## The Positive

Despite the blockers:

- **The technology is impressive** - Compact language and ZK proofs work well
- **Community is helpful** - Discord support was responsive
- **Progress is being made** - SDK is actively evolving
- **Most infrastructure works** - Network, wallet connection, proof server all functional

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

## Conclusion

**The contract was never the hard part. The hard part was getting the SDK stack to work together.**

A developer following the current documentation will:
1. Target the wrong network (testnet-02 instead of Preview)
2. Use incompatible SDK versions (v2.x instead of v3.0.0-alpha)
3. Be unable to deploy via browser due to runtime/bundler incompatibilities
4. Spend 8+ hours debugging issues that documentation would prevent

The Midnight technology is sophisticated and promising. The developer onboarding experience needs to catch up.

---

*Full technical details: [my-developer-experience.md](./my-developer-experience.md) (1600+ lines)*
