# My Developer Experience: Midnight Smart Contract POC

A chronological account of building and deploying a proof-of-authorship smart contract on the Midnight blockchain testnet.

## Objective

Deploy a simple "Proof of Authorship" smart contract to Midnight's testnet as an artifact demonstrating:
- Writing smart contracts in Compact (Midnight's DSL)
- Using the Midnight SDK for TypeScript-based deployment
- Working with ZK proof generation
- Navigating real-world blockchain development challenges

## Timeline

### 2026-01-23: Initial Implementation

Completed the core implementation:
- Wrote `proof-of-authorship.compact` - a simple contract storing author name, timestamp, contract hash, and a statement
- Created `deploy.ts` - TypeScript deployment script handling wallet setup, funding, and contract deployment
- Successfully compiled the contract using `compact compile`
- Built the TypeScript with no errors

### 2026-01-24: Deployment Attempt and Troubleshooting

#### First Deployment Attempt

Started the proof server via Docker and ran `npm run deploy`. The script successfully:
- Loaded the compiled contract
- Built the wallet from a seed
- Started syncing with the network

However, the wallet sync repeatedly showed:
```
[] | Timed out trying to connect
```

#### Systematic Investigation

Rather than assuming the issue, I conducted a methodical investigation.

**Step 1: Verify Testnet Endpoints**

Consulted the Midnight docs AI chatbot to confirm the correct endpoints:
- Indexer: `https://indexer.testnet-02.midnight.network/api/v1/graphql`
- Indexer WS: `wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws`
- RPC Node: `https://rpc.testnet-02.midnight.network`

Result: My endpoints matched the documentation exactly. No testnet-03 or path changes.

**Step 2: Check Authentication Requirements**

Asked the chatbot about API keys or required headers.

Result: No special authentication needed for basic access. Only requirements:
- `Content-Type: application/json` for HTTP
- `Sec-WebSocket-Protocol: graphql-transport-ws` for WebSocket

**Step 3: Test Individual Endpoints**

Tested each endpoint independently:

```bash
# RPC Node - SUCCESS
curl -X POST "https://rpc.testnet-02.midnight.network" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"chain_getBlockHash","params":[0],"id":1}'
# Returns: {"jsonrpc":"2.0","id":1,"result":"0x2757396f..."}

# Indexer - FAILED
curl "https://indexer.testnet-02.midnight.network/api/v1/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
# Returns: 503 Service Temporarily Unavailable (nginx)
```

Key finding: The blockchain (RPC node) was running fine, but the indexer service was unavailable.

**Step 4: Verify SDK Versions**

Asked the chatbot about recommended SDK versions. Found a discrepancy:
- My `compact-runtime`: 0.9.0
- Documented version: ^0.8.1

Fixed by updating `package.json` and running `npm install`. Note: This version mismatch wouldn't cause a server-side 503, but aligning with documented versions is best practice.

**Step 5: Community Outreach**

Posted on Midnight Discord with specific technical details:
- Described the 503 error on indexer endpoints
- Noted that RPC node works fine
- Asked if others could reach the indexer

Response from community member confirmed: "Since your RPC node is healthy but both the HTTP + WebSocket indexer endpoints are returning nginx 503, this strongly points to an indexer-side service outage or overload, not an issue in your code."

Additional insight: "If the indexer falls behind chain head, some providers take it offline until it resyncs."

**Step 6: Team Engagement**

A community/team member reached out directly: "Kindly send a PM let me check with the team." This led to direct communication with someone who could escalate the infrastructure issue internally.

**Step 7: Server-Side Confirmation**

The team member suggested potential causes for 503 errors (too many WS connections, aggressive polling, User-Agent header issues) and provided a diagnostic test:

```bash
curl -I https://indexer.testnet-02.midnight.network/health
curl -I https://indexer.testnet-02.midnight.network/
```

Both returned HTTP 503, confirming this was a server-side issue rather than rate-limiting on my end.

**Step 8: Network Discovery - Preview vs Testnet-02**

The team member asked if I was using a Lace wallet. This led to installing **Lace Midnight Preview** (a separate Chrome extension from the regular Cardano Lace wallet).

During Lace Midnight Preview setup, I discovered a critical distinction: the wallet connects to the **Preview** network, not **testnet-02**. When I asked Discord about this, they confirmed: "Preview in the Lace wallet is not the same as testnet-02; they are different networks."

The Lace configuration screen revealed the Preview network endpoints:

| Service | Preview Endpoint |
|---------|------------------|
| RPC Node | `https://rpc.preview.midnight.network` |
| Indexer | `https://indexer.preview.midnight.network/api/v3/graphql` |

Testing confirmed the Preview endpoints work:

```bash
# Preview Indexer - SUCCESS
curl "https://indexer.preview.midnight.network/api/v3/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
# Returns: {"data":{"__typename":"Query"}} (HTTP 200)

# Preview RPC - SUCCESS
curl -X POST "https://rpc.preview.midnight.network" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"chain_getBlockHash","params":[0],"id":1}'
# Returns: {"jsonrpc":"2.0","id":1,"result":"0x3acf6189..."}
```

This was a breakthrough: the documentation I followed pointed to testnet-02, but the recommended path (using Lace Midnight Preview) requires the Preview network.

---

### 2026-01-24: Deep Dive into Wallet/Seed Integration

After updating the deploy script to use Preview network endpoints, the next challenge was integrating with the Lace Midnight Preview wallet.

#### The Mnemonic vs Hex Seed Problem

**Initial Discovery**

The Midnight SDK's `WalletBuilder.build()` expects a hex-encoded seed:
```typescript
WalletBuilder.build(indexer, indexerWS, proofServer, node, seedHex, networkId, logLevel)
```

But Lace Midnight Preview uses a 24-word BIP-39 mnemonic. The Discord contact suggested exporting the Lace wallet's seed for CLI deployment, implying there should be a way to derive the same wallet.

**Research: How Does Midnight Expect Seeds?**

Installed `@midnight-ntwrk/wallet-sdk-hd` package (version 2.0.0) which provides HD wallet support. Key findings:

1. The SDK expects a 32-byte (64-character hex) seed
2. The `generateRandomSeed()` function produces 32 random bytes
3. There's no built-in `mnemonicToSeed` function exported

The SDK internally uses `@scure/bip39` for mnemonic validation.

#### Derivation Method Experiments

Created `src/verify-mnemonic.ts` to test different seed derivation approaches:

**Method 1: Raw Entropy**

BIP-39 24-word mnemonic = 256 bits of entropy = 32 bytes

```typescript
import { mnemonicToEntropy } from "@scure/bip39";
const entropy = mnemonicToEntropy(mnemonic, wordlist);
// Use as seed directly
```

Result: SDK accepted it (32 bytes), but address didn't match Lace.

**Method 2: Icarus/CIP-3 Derivation**

Cardano/Midnight uses Icarus-style key derivation (SLIP-0023):

```typescript
function deriveIcarusMasterKey(entropy: Uint8Array): Uint8Array {
  // PBKDF2-HMAC-SHA512 with 4096 iterations
  const derived = crypto.pbkdf2Sync(
    Buffer.from(""),           // empty password
    Buffer.from(entropy),       // entropy as salt
    4096,                       // iterations
    96,                         // 96 bytes output
    "sha512"
  );
  // Apply Ed25519 bit tweaking
  derived[0] &= 0xf8;
  derived[31] = (derived[31] & 0x1f) | 0x40;
  return derived.subarray(0, 32);  // first 32 bytes
}
```

Result: Different address, still didn't match Lace.

**Method 3: BIP-39 Standard Seed (first 32 bytes)**

Standard BIP-39 produces 64 bytes via PBKDF2:

```typescript
import { mnemonicToSeedSync } from "@scure/bip39";
const seed = mnemonicToSeedSync(mnemonic, "");  // 64 bytes
const first32 = seed.subarray(0, 32);
```

Result: Different address, still didn't match Lace.

**Method 4: BIP-39 Standard Seed (last 32 bytes)**

```typescript
const last32 = seed.subarray(32, 64);
```

Result: Different address, still didn't match Lace.

#### The Network ID Mismatch Discovery

After testing all 4 derivation methods, a pattern emerged:

| Derived Addresses | Lace Addresses |
|-------------------|----------------|
| `mn_shield-addr_test1...` | `mn_shield-addr_preview1...` |
| `mn_shield-addr_test1...` | `mn_addr_preview1...` |

**Key Finding**: All SDK-derived addresses have `_test1` prefix, but Lace shows `_preview1` prefix.

The SDK's `NetworkId` enum only has:
- `Undeployed`
- `DevNet`
- `TestNet`
- `MainNet`

There is no `Preview` option. Using `NetworkId.TestNet` produces `test1` addresses, not `preview1`.

This suggests a fundamental mismatch between:
1. What the SDK thinks "TestNet" means (`test1` prefix)
2. What the Preview network actually uses (`preview1` prefix)

#### Current Blockers

1. **Network ID Configuration**: The SDK doesn't have a `Preview` network ID that produces `preview1` addresses
2. **Unknown Derivation**: Even if we solve the network ID, we haven't found the correct seed derivation that matches Lace

#### Tools Created

- `src/verify-mnemonic.ts` - Tests multiple derivation methods and compares addresses
- `npm run verify-mnemonic` - Script to run the verification tool

---

## Findings

### What Works
- Contract compilation with Compact 0.2.0
- TypeScript deployment script structure
- Proof server (Docker) on localhost:6300
- Preview network connectivity (indexer and RPC respond)
- Wallet creation with SDK-generated seeds
- Mnemonic validation and entropy extraction
- Multiple seed derivation algorithms (Icarus, BIP-39, raw entropy)

### Current Blockers

1. **Network ID Mismatch**: SDK produces `_test1` addresses but Lace/Preview uses `_preview1` addresses. The SDK's `NetworkId.TestNet` doesn't map to Preview network's address format.

2. **Seed Derivation Unknown**: Tested 4 different derivation methods from mnemonic to seed; none produce addresses matching Lace wallet.

### SDK Version Alignment

Current dependencies (aligned with Preview network):

| Package | Version |
|---------|---------|
| @midnight-ntwrk/wallet | 5.0.0 |
| @midnight-ntwrk/wallet-sdk-hd | 2.0.0 |
| @midnight-ntwrk/midnight-js-* | 2.0.2 |
| @midnight-ntwrk/compact-runtime | 0.8.1 |
| @midnight-ntwrk/ledger | 4.0.0 |
| @midnight-ntwrk/zswap | 4.0.0 |

---

## Lessons Learned

### From Initial Troubleshooting (Session 1)

1. **Test endpoints independently** - When deployment fails, isolate which service is actually down. The RPC node and indexer are separate services.

2. **Consult official docs carefully** - The Midnight docs AI chatbot was helpful for verifying endpoints and SDK versions.

3. **Version alignment matters** - Even if newer versions exist, stick with the documented compatibility matrix for testnet.

4. **Community is a resource** - Discord provided quick confirmation that the issue was infrastructure-side, saving further debugging time. A team member also proactively reached out to escalate the issue internally.

5. **The indexer is critical** - Unlike some blockchains where you can interact directly with nodes, Midnight's wallet SDK requires the indexer for synchronization.

6. **Multiple networks exist** - Midnight has multiple networks (testnet-02, Preview, etc.). The Lace Midnight Preview wallet specifically uses the Preview network.

7. **Lace Midnight Preview is separate** - The Midnight-enabled Lace wallet is a separate Chrome extension from the regular Cardano Lace wallet.

### From Wallet Integration (Session 2)

8. **Seed format matters** - The SDK expects 32-byte hex seeds, not 24-word mnemonics or 64-byte BIP-39 seeds.

9. **Cardano heritage affects Midnight** - Midnight inherits from Cardano, which uses Icarus-style key derivation (PBKDF2 with 4096 iterations) rather than standard BIP-39 PBKDF2 (2048 iterations).

10. **Network IDs affect address encoding** - Midnight addresses include network identifiers in their Bech32m encoding (`test1`, `preview1`, etc.). The SDK's network configuration must match the target network.

11. **Address format is revealing** - The address prefix (e.g., `mn_shield-addr_preview1`) encodes: network type (preview), address type (shielded), and is useful for debugging integration issues.

12. **Build verification tools** - Creating `verify-mnemonic.ts` to test derivation methods systematically was more efficient than trial-and-error in the deployment script.

13. **Document negative results** - Recording what DIDN'T work (4 derivation methods) is as valuable as what did work.

---

## Resolution

*In Progress* - Wallet integration with Lace Midnight Preview remains unsolved due to network ID mismatch and unknown seed derivation.

**Two paths forward:**

1. **Ask Discord contact about specific issue**: "SDK produces `_test1` addresses but Lace shows `_preview1`. Is there a different NetworkId or SDK configuration for Preview network?"

2. **Use fresh CLI-generated wallet**: Bypass Lace integration entirely; generate a new seed with the deploy script and fund it via the Preview faucet.

---

## Next Session: Picking Up Where We Left Off

### Current State

- **Contract**: Compiled and ready in `contracts/managed/proof-of-authorship/`
- **Deploy script**: Updated for Preview network endpoints
- **Proof server**: Docker container running on localhost:6300 (up 20+ hours)
- **Lace Midnight Preview**: Installed, wallet created, but integration blocked
- **Verification tool**: `src/verify-mnemonic.ts` tests multiple derivation methods

### What Works

- Preview network indexer: `https://indexer.preview.midnight.network/api/v3/graphql`
- Preview network RPC: `https://rpc.preview.midnight.network`
- Contract compilation: `npm run compile`
- TypeScript build: `npm run build`
- Wallet creation with hex seeds
- Mnemonic validation and derivation (addresses don't match Lace)

### Immediate Blocker

**Network ID / Address Prefix Mismatch**:
- SDK with `NetworkId.TestNet` produces: `mn_shield-addr_test1...`
- Lace Midnight Preview shows: `mn_shield-addr_preview1...`

This affects all derivation methods - even if we find the correct seed, the address format won't match.

### Recommended Next Steps

**Option A: Consult Discord Contact (Preferred)**

Message Amy.ether with this specific question:

> "I tried exporting my Lace mnemonic and using it with WalletBuilder.build(). The derivation works (no errors), but the addresses have `_test1` prefix while my Lace shows `_preview1` prefix. I'm using `setNetworkId(NetworkId.TestNet)` - is there a different network ID for Preview? Or a different SDK configuration needed?"

This is a precise technical question they can likely answer quickly.

**Option B: Use Fresh CLI Wallet (Fallback)**

If Lace integration remains blocked:

1. Run `npm run deploy`
2. Answer `n` when asked about existing seed
3. Save the generated seed
4. Fund via https://faucet.preview.midnight.network/
5. Proceed with deployment

This bypasses Lace but achieves the deployment goal.

### Commands to Resume

```bash
# Verify proof server is running
docker ps | grep proof-server

# Quick connectivity test
curl -s "https://indexer.preview.midnight.network/api/v3/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'

# Test derivation methods (if continuing Lace integration)
npm run verify-mnemonic

# Build and deploy (once wallet issue resolved)
npm run build
npm run deploy
```

### Key Files

| File | Purpose |
|------|---------|
| `src/deploy.ts` | Main deployment script (Preview network configured) |
| `src/verify-mnemonic.ts` | Mnemonic derivation test tool |
| `contracts/proof-of-authorship.compact` | Smart contract source |
| `docs/my-developer-experience.md` | This document |

### Open Questions for Discord

1. Is there a `NetworkId.Preview` or equivalent for Preview network addresses?
2. What seed derivation does Lace Midnight Preview use internally?
3. Is there SDK documentation for CLI + Lace wallet integration?

### Lace Wallet Details (for reference)

- **Shielded address**: `mn_shield-addr_preview16ghcqxr57xlzmk37nd6r26yyl4jm4kd9wa8cvnqh7wfwcugsa3cq4kcgyfys7n60czywmvnf3sgackrqzmlu7selrxw9qrcfkkdx5qsx0xvs7`
- **Unshielded address**: `mn_addr_preview1zw853n0463w08e5ad9uneu09dpa58g96s7ejjwqrvj9k06xk6t8qhw2js7`
- **Balance**: 0 tDUST (unfunded)

---

*Last updated: 2026-01-24*
