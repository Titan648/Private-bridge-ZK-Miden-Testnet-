import { useState, useEffect } from 'react';
import { BridgeInterface } from './components/BridgeInterface';
import { TransferList } from './components/TransferList';
import { BridgeStats } from './components/BridgeStats';
import { ShieldedTransfer, BridgeState } from './types/bridge';
import './App.css';

function App() {
  const [transfers, setTransfers] = useState<ShieldedTransfer[]>([]);
  const [bridgeState, setBridgeState] = useState<BridgeState | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const websocket = new WebSocket('ws://localhost:3001');
    
    websocket.onopen = () => {
      console.log('Connected to relayer');
    };

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'transfer_update') {
        setTransfers(prev => {
          const index = prev.findIndex(t => t.id === message.data.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = message.data;
            return updated;
          }
          return [...prev, message.data];
        });
      }
    };

    setWs(websocket);

    // Fetch initial data
    fetchBridgeState();
    fetchTransfers();

    return () => {
      websocket.close();
    };
  }, []);

  const fetchBridgeState = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/bridge/state');
      const data = await response.json();
      setBridgeState(data);
    } catch (error) {
      console.error('Error fetching bridge state:', error);
    }
  };

  const fetchTransfers = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/transfers');
      const data = await response.json();
      setTransfers(data);
    } catch (error) {
      console.error('Error fetching transfers:', error);
    }
  };

  const handleTransferInitiated = (transfer: ShieldedTransfer) => {
    setTransfers(prev => [...prev, transfer]);
    fetchBridgeState();
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🔒 Zcash ⟷ Miden Private Bridge</h1>
        <p className="subtitle">Shielded Cross-Chain Transfers</p>
      </header>

      <main className="app-main">
        {bridgeState && <BridgeStats state={bridgeState} />}
        
        <BridgeInterface onTransferInitiated={handleTransferInitiated} />
        
        <TransferList transfers={transfers} />
      </main>

      <footer className="app-footer">
        <p>⚠️ Testnet Only - Privacy-Preserving Bridge Technology</p>
      </footer>
    </div>
  );
}

export default App;
