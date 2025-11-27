import { useState } from 'react';
import { ShieldedTransfer } from '../types/bridge';
import './BridgeInterface.css';

interface BridgeInterfaceProps {
  onTransferInitiated: (transfer: ShieldedTransfer) => void;
}

export function BridgeInterface({ onTransferInitiated }: BridgeInterfaceProps) {
  const [direction, setDirection] = useState<'zcash-to-miden' | 'miden-to-zcash'>('zcash-to-miden');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateRandomBigInt = () => {
    return BigInt(Math.floor(Math.random() * 1000000000000));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const secret = generateRandomBigInt();
      const nullifier = generateRandomBigInt();

      const response = await fetch(`http://localhost:3001/api/bridge/${direction}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          recipient,
          secret: secret.toString(),
          nullifier: nullifier.toString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Transfer failed');
      }

      const transfer = await response.json();
      onTransferInitiated(transfer);

      // Reset form
      setAmount('');
      setRecipient('');
      
      alert(`Transfer initiated! ID: ${transfer.id}\n\nSave these values:\nSecret: ${secret}\nNullifier: ${nullifier}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bridge-interface">
      <h2>Initiate Shielded Transfer</h2>

      <div className="direction-selector">
        <button
          className={direction === 'zcash-to-miden' ? 'active' : ''}
          onClick={() => setDirection('zcash-to-miden')}
        >
          Zcash → Miden
        </button>
        <button
          className={direction === 'miden-to-zcash' ? 'active' : ''}
          onClick={() => setDirection('miden-to-zcash')}
        >
          Miden → Zcash
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Amount (base units)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000000"
            required
            min="1"
          />
        </div>

        <div className="form-group">
          <label>Recipient Address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder={direction === 'zcash-to-miden' ? 'Miden account ID' : 'Zcash shielded address'}
            required
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Processing...' : 'Initiate Transfer'}
        </button>
      </form>

      <div className="info-box">
        <h3>🔐 Privacy Features</h3>
        <ul>
          <li>Zero-knowledge proofs hide transfer amounts</li>
          <li>Commitments prevent double-spending</li>
          <li>Nullifiers ensure one-time use</li>
          <li>Merkle trees verify state transitions</li>
        </ul>
      </div>
    </div>
  );
}
