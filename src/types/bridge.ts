export interface ShieldedTransfer {
  id: string;
  sourceChain: 'zcash' | 'miden';
  destinationChain: 'zcash' | 'miden';
  amount: bigint;
  commitment: string;
  nullifier: string;
  proof: ZKProof;
  status: TransferStatus;
  timestamp: number;
}

export interface ZKProof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol: string;
  curve: string;
}

export enum TransferStatus {
  PENDING = 'pending',
  PROVING = 'proving',
  RELAYING = 'relaying',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface ZcashShieldedNote {
  value: bigint;
  recipient: string;
  memo: string;
  commitment: string;
  nullifier: string;
}

export interface MidenNote {
  id: string;
  assets: MidenAsset[];
  script: string;
  inputs: string[];
  serial_num: string;
}

export interface MidenAsset {
  faucet_id: string;
  amount: bigint;
}

export interface BridgeState {
  totalLocked: bigint;
  totalBridged: bigint;
  activeTransfers: number;
  merkleRoot: string;
}

export interface RelayerConfig {
  zcashRpc: string;
  midenRpc: string;
  privateKey: string;
  bridgeAddress: string;
  port: number;
}
