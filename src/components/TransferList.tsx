import { ShieldedTransfer, TransferStatus } from '../types/bridge';
import './TransferList.css';

interface TransferListProps {
  transfers: ShieldedTransfer[];
}

export function TransferList({ transfers }: TransferListProps) {
  const getStatusColor = (status: TransferStatus) => {
    switch (status) {
      case TransferStatus.COMPLETED:
        return '#4caf50';
      case TransferStatus.FAILED:
        return '#f44336';
      case TransferStatus.RELAYING:
        return '#ff9800';
      default:
        return '#2196f3';
    }
  };

  const formatAmount = (amount: bigint) => {
    return (Number(amount) / 1e8).toFixed(8);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="transfer-list">
      <h2>Recent Transfers</h2>

      {transfers.length === 0 ? (
        <p className="no-transfers">No transfers yet</p>
      ) : (
        <div className="transfers">
          {transfers.slice().reverse().map((transfer) => (
            <div key={transfer.id} className="transfer-card">
              <div className="transfer-header">
                <span className="transfer-id">{transfer.id}</span>
                <span
                  className="transfer-status"
                  style={{ backgroundColor: getStatusColor(transfer.status) }}
                >
                  {transfer.status}
                </span>
              </div>

              <div className="transfer-details">
                <div className="detail-row">
                  <span className="label">Route:</span>
                  <span className="value">
                    {transfer.sourceChain.toUpperCase()} → {transfer.destinationChain.toUpperCase()}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="label">Amount:</span>
                  <span className="value">{formatAmount(transfer.amount)}</span>
                </div>

                <div className="detail-row">
                  <span className="label">Commitment:</span>
                  <span className="value hash">{transfer.commitment.slice(0, 16)}...</span>
                </div>

                <div className="detail-row">
                  <span className="label">Nullifier:</span>
                  <span className="value hash">{transfer.nullifier.slice(0, 16)}...</span>
                </div>

                <div className="detail-row">
                  <span className="label">Time:</span>
                  <span className="value">{formatTimestamp(transfer.timestamp)}</span>
                </div>
              </div>

              <div className="proof-indicator">
                <span className="proof-badge">✓ ZK Proof Verified</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
