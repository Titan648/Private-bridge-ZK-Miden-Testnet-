import { ZcashClient } from '../chains/zcash';
import { MidenClient } from '../chains/miden';
import { ZKPGenerator } from '../crypto/zkp';
import { ShieldedTransfer, TransferStatus, BridgeState } from '../types/bridge';

export class PrivateBridge {
  private zcashClient: ZcashClient;
  private midenClient: MidenClient;
  private zkpGenerator: ZKPGenerator;
  private transfers: Map<string, ShieldedTransfer>;
  private commitments: Set<string>;
  private nullifiers: Set<string>;

  constructor(zcashRpc: string, midenRpc: string) {
    this.zcashClient = new ZcashClient(zcashRpc);
    this.midenClient = new MidenClient(midenRpc);
    this.zkpGenerator = new ZKPGenerator();
    this.transfers = new Map();
    this.commitments = new Set();
    this.nullifiers = new Set();
  }

  async initialize() {
    await this.zkpGenerator.initialize();
  }

  // Initiate bridge transfer from Zcash to Miden
  async bridgeZcashToMiden(
    amount: bigint,
    recipient: string,
    secret: bigint,
    nullifier: bigint
  ): Promise<ShieldedTransfer> {
    // Generate commitment
    const commitment = await this.zkpGenerator.generateCommitment(
      amount,
      secret,
      nullifier
    );

    // Check if commitment already exists (prevent double-spend)
    if (this.commitments.has(commitment)) {
      throw new Error('Commitment already exists');
    }

    // Generate ZK proof
    const { proof, publicSignals } = await this.zkpGenerator.generateBridgeProof({
      amount,
      secret,
      nullifier,
      recipient,
      sourceChain: 0, // Zcash
      destinationChain: 1, // Miden
    });

    const transfer: ShieldedTransfer = {
      id: this.generateTransferId(),
      sourceChain: 'zcash',
      destinationChain: 'miden',
      amount,
      commitment,
      nullifier: publicSignals[1],
      proof,
      status: TransferStatus.PENDING,
      timestamp: Date.now(),
    };

    this.transfers.set(transfer.id, transfer);
    this.commitments.add(commitment);

    // Create and send Zcash shielded transaction
    const zcashNote = await this.zcashClient.createShieldedTransaction(
      amount,
      recipient,
      `Bridge to Miden: ${transfer.id}`
    );

    transfer.status = TransferStatus.PROVING;
    await this.zcashClient.sendShieldedTransaction(zcashNote);

    return transfer;
  }

  // Initiate bridge transfer from Miden to Zcash
  async bridgeMidenToZcash(
    amount: bigint,
    recipient: string,
    secret: bigint,
    nullifier: bigint
  ): Promise<ShieldedTransfer> {
    // Generate commitment
    const commitment = await this.zkpGenerator.generateCommitment(
      amount,
      secret,
      nullifier
    );

    if (this.commitments.has(commitment)) {
      throw new Error('Commitment already exists');
    }

    // Generate ZK proof
    const { proof, publicSignals } = await this.zkpGenerator.generateBridgeProof({
      amount,
      secret,
      nullifier,
      recipient,
      sourceChain: 1, // Miden
      destinationChain: 0, // Zcash
    });

    const transfer: ShieldedTransfer = {
      id: this.generateTransferId(),
      sourceChain: 'miden',
      destinationChain: 'zcash',
      amount,
      commitment,
      nullifier: publicSignals[1],
      proof,
      status: TransferStatus.PENDING,
      timestamp: Date.now(),
    };

    this.transfers.set(transfer.id, transfer);
    this.commitments.add(commitment);

    // Create and submit Miden note
    const midenNote = await this.midenClient.createNote(
      [{ faucet_id: 'bridge_faucet', amount }],
      recipient
    );

    transfer.status = TransferStatus.PROVING;
    await this.midenClient.submitNote(midenNote);

    return transfer;
  }

  // Complete transfer (called by relayer)
  async completeTransfer(transferId: string): Promise<boolean> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      throw new Error('Transfer not found');
    }

    // Verify proof
    const isValid = await this.zkpGenerator.verifyProof(
      transfer.proof,
      [transfer.commitment, transfer.nullifier]
    );

    if (!isValid) {
      transfer.status = TransferStatus.FAILED;
      return false;
    }

    // Check nullifier hasn't been used
    if (this.nullifiers.has(transfer.nullifier)) {
      transfer.status = TransferStatus.FAILED;
      throw new Error('Nullifier already used (double-spend attempt)');
    }

    transfer.status = TransferStatus.RELAYING;

    // Execute destination chain transaction
    if (transfer.destinationChain === 'miden') {
      const midenNote = await this.midenClient.createNote(
        [{ faucet_id: 'bridge_faucet', amount: transfer.amount }],
        'recipient_account'
      );
      await this.midenClient.submitNote(midenNote);
    } else {
      const zcashNote = await this.zcashClient.createShieldedTransaction(
        transfer.amount,
        'recipient_address',
        `Bridge from Miden: ${transferId}`
      );
      await this.zcashClient.sendShieldedTransaction(zcashNote);
    }

    // Mark nullifier as used
    this.nullifiers.add(transfer.nullifier);
    transfer.status = TransferStatus.COMPLETED;

    return true;
  }

  // Get transfer status
  getTransfer(transferId: string): ShieldedTransfer | undefined {
    return this.transfers.get(transferId);
  }

  // Get all transfers
  getAllTransfers(): ShieldedTransfer[] {
    return Array.from(this.transfers.values());
  }

  // Get bridge state
  async getBridgeState(): Promise<BridgeState> {
    const transfers = Array.from(this.transfers.values());
    const completed = transfers.filter(t => t.status === TransferStatus.COMPLETED);
    
    const totalBridged = completed.reduce((sum, t) => sum + t.amount, 0n);
    const activeTransfers = transfers.filter(
      t => t.status !== TransferStatus.COMPLETED && t.status !== TransferStatus.FAILED
    ).length;

    const commitmentList = Array.from(this.commitments);
    const merkleRoot = await this.zkpGenerator.generateMerkleRoot(commitmentList);

    return {
      totalLocked: totalBridged,
      totalBridged,
      activeTransfers,
      merkleRoot,
    };
  }

  private generateTransferId(): string {
    return `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
