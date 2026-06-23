#!/usr/bin/env bash
# Deploy the ZKADE Soroban stack to Stellar testnet.
#
#   - builds + deploys the vendored RISC Zero Groth16 verifier
#   - builds + deploys the sudoku game contract, wired to the verifier, the
#     guest image id, and the deposit/reward token (XLM SAC by default)
#   - writes addresses to soroban/deployment.json
#
# Prereqs: stellar CLI, the RISC Zero toolchain (rzup), Docker (for Groth16),
# and a funded testnet identity (default alias: zkade).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NETWORK="${NETWORK:-testnet}"
IDENTITY="${IDENTITY:-zkade}"
TOKEN="${REWARD_TOKEN:-$(stellar contract id asset --asset native --network "$NETWORK")}"

echo "▶ ensuring funded identity '$IDENTITY' on $NETWORK"
stellar keys address "$IDENTITY" >/dev/null 2>&1 || \
  stellar keys generate "$IDENTITY" --network "$NETWORK" --fund
OWNER="$(stellar keys address "$IDENTITY")"

echo "▶ deriving guest image id"
IMAGE_ID="$(cd "$ROOT/games/sudoku" && cargo run -q -p sudoku-host --release 2>/dev/null \
  | sed -n 's/^image_id (SUDOKU_ID) = 0x//p' | head -1)"
[ -n "$IMAGE_ID" ] || { echo "failed to derive image id"; exit 1; }
echo "  image_id = $IMAGE_ID"

echo "▶ building + deploying Groth16 verifier"
(cd "$ROOT/risc0-verifier" && stellar contract build --package groth16-verifier >/dev/null)
VERIFIER="$(stellar contract deploy \
  --wasm "$ROOT/risc0-verifier/target/wasm32v1-none/release/groth16_verifier.wasm" \
  --source "$IDENTITY" --network "$NETWORK")"
echo "  verifier = $VERIFIER"

echo "▶ building + deploying sudoku game contract"
(cd "$ROOT/soroban" && stellar contract build >/dev/null)
SUDOKU="$(stellar contract deploy \
  --wasm "$ROOT/soroban/target/wasm32v1-none/release/sudoku.wasm" \
  --source "$IDENTITY" --network "$NETWORK" \
  -- --owner "$OWNER" --image_id "$IMAGE_ID" --verifier "$VERIFIER" --token "$TOKEN")"
echo "  sudoku   = $SUDOKU"

cat > "$ROOT/soroban/deployment.json" <<JSON
{
  "network": "$NETWORK",
  "owner": "$OWNER",
  "image_id": "$IMAGE_ID",
  "verifier": "$VERIFIER",
  "token": "$TOKEN",
  "sudoku": "$SUDOKU"
}
JSON
echo "▶ wrote $ROOT/soroban/deployment.json"
