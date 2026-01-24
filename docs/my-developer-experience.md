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

## Findings

### What Works
- Contract compilation with Compact 0.2.0
- TypeScript deployment script structure
- Proof server (Docker) on localhost:6300
- RPC node connectivity
- Wallet seed generation and restoration

### What Was the Issue
Two compounding issues:

1. **Testnet-02 indexer outage** - The indexer at `indexer.testnet-02.midnight.network` was returning 503 errors. This is infrastructure-level, not a code issue.

2. **Wrong network** - More fundamentally, the documentation I followed pointed to testnet-02, but the current recommended approach using Lace Midnight Preview requires the **Preview** network with different endpoints entirely.

The indexer is required for:
- Initial wallet syncing
- Reading chain state
- Contract discovery

Without it, deployment cannot proceed - this is by design, not a limitation of my implementation.

### SDK Version Alignment

Updated dependencies to match documented testnet setup:

| Package | Before | After |
|---------|--------|-------|
| @midnight-ntwrk/compact-runtime | 0.9.0 | 0.8.1 |

## Lessons Learned

1. **Test endpoints independently** - When deployment fails, isolate which service is actually down. The RPC node and indexer are separate services.

2. **Consult official docs carefully** - The Midnight docs AI chatbot was helpful for verifying endpoints and SDK versions.

3. **Version alignment matters** - Even if newer versions exist, stick with the documented compatibility matrix for testnet.

4. **Community is a resource** - Discord provided quick confirmation that the issue was infrastructure-side, saving further debugging time. A team member also proactively reached out to escalate the issue internally - a positive sign for developer support.

5. **The indexer is critical** - Unlike some blockchains where you can interact directly with nodes, Midnight's wallet SDK requires the indexer for synchronization.

6. **Multiple networks exist** - Midnight has multiple networks (testnet-02, Preview, etc.). Documentation may reference different networks. The Lace Midnight Preview wallet specifically uses the Preview network, which has its own endpoints. Always verify which network your tools expect.

7. **Lace Midnight Preview is separate** - The Midnight-enabled Lace wallet is a separate Chrome extension from the regular Cardano Lace wallet. It uses a 24-word mnemonic (not a hex seed) and connects to the Preview network by default.

## Resolution

*In Progress* - Discovered that the correct network is Preview, not testnet-02. Updating deployment configuration to use Preview network endpoints.

## Next Steps

1. Update `deploy.ts` to use Preview network endpoints
2. Configure wallet integration with Lace Midnight Preview (24-word mnemonic)
3. Fund wallet with tDUST via Preview network faucet
4. Re-run deployment
5. Document successful deployment in `deployment.json`

---

## Next Session: Picking Up Where We Left Off

### Current State
- **Contract**: Compiled and ready in `contracts/managed/proof-of-authorship/`
- **Deploy script**: Updated to use Preview network endpoints (not testnet-02)
- **Proof server**: Docker container running on localhost:6300
- **Lace Midnight Preview**: Installed as Chrome extension, wallet created with 24-word mnemonic

### What Works
- Preview network indexer responds: `https://indexer.preview.midnight.network/api/v3/graphql`
- Preview network RPC responds: `https://rpc.preview.midnight.network`
- Contract compiles with `npm run compile`
- TypeScript builds with `npm run build`

### Immediate Next Step
**Resolve mnemonic vs hex seed issue**: The deploy script uses `WalletBuilder.buildFromSeed()` which expects a 64-character hex seed. Lace Midnight Preview uses a 24-word BIP-39 mnemonic. Options to investigate:

1. Check if Lace can export a hex seed (look in wallet settings)
2. Convert mnemonic to hex seed using a BIP-39 library
3. Check Midnight SDK for a mnemonic-based wallet builder method

### Commands to Resume
```bash
# Verify proof server is running
curl -s http://127.0.0.1:6300 && echo "Proof server OK"

# Test Preview indexer
curl -s "https://indexer.preview.midnight.network/api/v3/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'

# Build and deploy (once seed issue is resolved)
npm run build
npm run deploy
```

### Key Files
- `src/deploy.ts` - Deployment script (updated for Preview network)
- `contracts/proof-of-authorship.compact` - Smart contract source
- `docs/my-developer-experience.md` - This document

### Discord Contact
A team member has been helping troubleshoot. If issues persist, continue the Discord conversation about Preview network deployment.

---

*Last updated: 2026-01-24*
