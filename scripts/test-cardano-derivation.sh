#!/bin/bash
#
# Test Cardano address derivation from mnemonic using cardano-address CLI
# This script helps verify if we can derive the same addresses as Lace wallet
#
# Usage: ./scripts/test-cardano-derivation.sh
#

CARDANO_ADDRESS="/tmp/cardano-address"

# Check if cardano-address is available
if [ ! -x "$CARDANO_ADDRESS" ]; then
    echo "Error: cardano-address not found at $CARDANO_ADDRESS"
    echo "Please ensure the tool is installed first."
    exit 1
fi

echo "==========================================="
echo "  Cardano Address Derivation Test"
echo "==========================================="
echo ""
echo "This script will derive addresses from your mnemonic using"
echo "the cardano-address CLI tool (official Cardano Foundation tool)."
echo ""
echo "Your mnemonic will NOT be stored or logged."
echo ""
echo "Enter your 24-word mnemonic phrase (words separated by spaces):"
echo ""

# Read mnemonic securely (won't echo to terminal)
read -s MNEMONIC

echo ""
echo "Processing..."
echo ""

# Create temp directory for intermediate files
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Step 1: Convert mnemonic to root private key (Shelley era)
echo "$MNEMONIC" | $CARDANO_ADDRESS key from-recovery-phrase Shelley > "$TMPDIR/root.prv" 2>&1

if [ $? -ne 0 ]; then
    echo "Error: Failed to derive root key from mnemonic"
    echo "Make sure you entered a valid 24-word mnemonic."
    cat "$TMPDIR/root.prv"
    exit 1
fi

echo "Step 1: Root key derived successfully"

# Step 2: Derive account key (m/1852'/1815'/0')
cat "$TMPDIR/root.prv" | $CARDANO_ADDRESS key child 1852H/1815H/0H > "$TMPDIR/acct.prv"
echo "Step 2: Account key derived (m/1852'/1815'/0')"

# Step 3: Derive payment key (m/1852'/1815'/0'/0/0)
cat "$TMPDIR/acct.prv" | $CARDANO_ADDRESS key child 0/0 > "$TMPDIR/payment.prv"
cat "$TMPDIR/payment.prv" | $CARDANO_ADDRESS key public --with-chain-code > "$TMPDIR/payment.pub"
echo "Step 3: Payment key derived (m/1852'/1815'/0'/0/0)"

# Step 4: Derive stake key (m/1852'/1815'/0'/2/0)
cat "$TMPDIR/acct.prv" | $CARDANO_ADDRESS key child 2/0 > "$TMPDIR/stake.prv"
cat "$TMPDIR/stake.prv" | $CARDANO_ADDRESS key public --with-chain-code > "$TMPDIR/stake.pub"
echo "Step 4: Stake key derived (m/1852'/1815'/0'/2/0)"

echo ""
echo "==========================================="
echo "  Derived Addresses"
echo "==========================================="

# Generate addresses for different networks
echo ""
echo "--- MAINNET Addresses ---"
MAINNET_PAYMENT=$(cat "$TMPDIR/payment.pub" | $CARDANO_ADDRESS address payment --network-tag mainnet)
MAINNET_STAKE=$(cat "$TMPDIR/stake.pub" | $CARDANO_ADDRESS address stake --network-tag mainnet)
echo "Payment: $MAINNET_PAYMENT"
echo "Stake:   $MAINNET_STAKE"

echo ""
echo "--- TESTNET Addresses (network-tag testnet) ---"
TESTNET_PAYMENT=$(cat "$TMPDIR/payment.pub" | $CARDANO_ADDRESS address payment --network-tag testnet)
TESTNET_STAKE=$(cat "$TMPDIR/stake.pub" | $CARDANO_ADDRESS address stake --network-tag testnet)
echo "Payment: $TESTNET_PAYMENT"
echo "Stake:   $TESTNET_STAKE"

echo ""
echo "--- Delegation Addresses (payment + stake combined) ---"
echo "Mainnet: $(cat "$TMPDIR/payment.pub" | $CARDANO_ADDRESS address payment --network-tag mainnet | $CARDANO_ADDRESS address delegation $(cat "$TMPDIR/stake.pub" | $CARDANO_ADDRESS key hash))"
echo "Testnet: $(cat "$TMPDIR/payment.pub" | $CARDANO_ADDRESS address payment --network-tag testnet | $CARDANO_ADDRESS address delegation $(cat "$TMPDIR/stake.pub" | $CARDANO_ADDRESS key hash))"

echo ""
echo "==========================================="
echo "  Raw Key Information"
echo "==========================================="
echo ""
echo "Payment public key hash:"
cat "$TMPDIR/payment.pub" | $CARDANO_ADDRESS key hash

echo ""
echo "Stake public key hash:"
cat "$TMPDIR/stake.pub" | $CARDANO_ADDRESS key hash

echo ""
echo "Root extended private key (first 64 chars):"
head -c 64 "$TMPDIR/root.prv"
echo "..."

echo ""
echo "==========================================="
echo "  Compare with Lace"
echo "==========================================="
echo ""
echo "Compare the addresses above with what Lace shows."
echo ""
echo "Your Lace addresses (from dev journal):"
echo "  Shielded: mn_shield-addr_preview16ghcqxr57xlzmk37nd6r26yyl4jm4kd9wa8cvnqh7wfwcugsa3cq4kcgyfys7n60czywmvnf3sgackrqzmlu7selrxw9qrcfkkdx5qsx0xvs7"
echo "  Unshielded: mn_addr_preview1zw853n0463w08e5ad9uneu09dpa58g96s7ejjwqrvj9k06xk6t8qhw2js7"
echo ""
echo "Note: Midnight addresses have 'mn_' prefix, Cardano has 'addr_' prefix."
echo "The derivation paths and key material may still be related."
echo ""
