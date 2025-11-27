# Zcash-Miden Private Bridge

A privacy-preserving cross-chain bridge enabling shielded transfers between Zcash testnet and Miden testnet.

## Features

- 🔒 **Zero-Knowledge Proofs**: All transfers use ZK proofs to hide amounts and participants
- 🌉 **Bidirectional Bridge**: Transfer assets from Zcash to Miden and vice versa
- 🛡️ **Privacy Preserving**: Commitments and nullifiers prevent double-spending while maintaining privacy
- ⚡ **Real-time Updates**: WebSocket integration for live transfer status
- 🌳 **Merkle Tree Verification**: State transitions verified using Merkle trees

## Architecture

### Components

1. **Zcash Client** (`src/chains/zcash.ts`)
   - Handles shielded transactions on Zcash testnet
   - Creates and verifies shielded notes
   - Manages z-addresses and commitments

2. **Miden Client** (`src/chains/miden.ts`)
   - Interacts with Miden rollup network
   - Creates and consumes private notes
   - Manages account state transitions

3. **ZKP Generator** (`src/crypto/zkp.ts`)
   - Generates zero-knowledge proofs for transfers
   - Creates commitments and nullifiers
   - Builds Merkle trees for state verification

4. **Bridge Core** (`src/bridge/core.ts`)
   - Coordinates cross-chain transfers
   - Validates proofs and prevents double-spending
   - Maintains bridge state and transfer history

5. **Relayer Service** (`src/relayer/index.ts`)
   - REST API for initiating transfers
   - WebSocket server for real-time updates
   - Automated transfer completion

## Privacy Mechanisms

### Commitments
Each transfer creates a cryptographic commitment:
