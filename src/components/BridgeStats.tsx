import { BridgeState } from '../types/bridge';
import './BridgeStats.css';

interface BridgeStatsProps {
  state: BridgeState;
}

export function BridgeStats({ state }: BridgeStatsProps) {
  const formatAmount = (amount: bigint) => {
    return (Number(amount) / 1e8).toFixed(8);
  };

  return (
    <div className="bridge-stats">
      <div className="stat-card">
        <div className="stat-icon">🔒</div>
        <div className="stat-content">
          <div className="stat-label">Total Locked</div>
          <div className="stat-value">{formatAmount(state.totalLocked)}</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon">🌉</div>
        <div className="stat-content">
          <div className="stat-label">Total Bridged</div>
          <div className="stat-value">{formatAmount(state.totalBridged)}</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon">⚡</div>
        <div className="stat-content">
          <div className="stat-label">Active Transfers</div>
          <div className="stat-value">{state.activeTransfers}</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon">🌳</div>
        <div className="stat-content">
          <div className="stat-label">Merkle Root</div>
          <div className="stat-value hash">{state.merkleRoot.slice(0, 12)}...</div>
        </div>
      </div>
    </div>
  );
}
