import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { PrivateBridge } from '../bridge/core';
import { TransferStatus } from '../types/bridge';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize bridge
const bridge = new PrivateBridge(
  process.env.ZCASH_TESTNET_RPC || 'https://testnet.zcash.network',
  process.env.MIDEN_TESTNET_RPC || 'https://testnet.miden.network'
);

await bridge.initialize();

// WebSocket server for real-time updates
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
  console.log('Client connected to relayer');

  ws.on('message', (message) => {
    console.log('Received:', message.toString());
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// REST API endpoints

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Get bridge state
app.get('/api/bridge/state', async (req, res) => {
  try {
    const state = await bridge.getBridgeState();
    res.json(state);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Initiate Zcash to Miden transfer
app.post('/api/bridge/zcash-to-miden', async (req, res) => {
  try {
    const { amount, recipient, secret, nullifier } = req.body;

    const transfer = await bridge.bridgeZcashToMiden(
      BigInt(amount),
      recipient,
      BigInt(secret),
      BigInt(nullifier)
    );

    // Broadcast to WebSocket clients
    broadcastTransferUpdate(transfer);

    res.json(transfer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Initiate Miden to Zcash transfer
app.post('/api/bridge/miden-to-zcash', async (req, res) => {
  try {
    const { amount, recipient, secret, nullifier } = req.body;

    const transfer = await bridge.bridgeMidenToZcash(
      BigInt(amount),
      recipient,
      BigInt(secret),
      BigInt(nullifier)
    );

    broadcastTransferUpdate(transfer);

    res.json(transfer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get transfer status
app.get('/api/transfer/:id', (req, res) => {
  const transfer = bridge.getTransfer(req.params.id);
  
  if (!transfer) {
    return res.status(404).json({ error: 'Transfer not found' });
  }

  res.json(transfer);
});

// Get all transfers
app.get('/api/transfers', (req, res) => {
  const transfers = bridge.getAllTransfers();
  res.json(transfers);
});

// Complete transfer (relayer operation)
app.post('/api/transfer/:id/complete', async (req, res) => {
  try {
    const success = await bridge.completeTransfer(req.params.id);
    const transfer = bridge.getTransfer(req.params.id);

    if (transfer) {
      broadcastTransferUpdate(transfer);
    }

    res.json({ success, transfer });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Broadcast transfer updates to WebSocket clients
function broadcastTransferUpdate(transfer: any) {
  const message = JSON.stringify({
    type: 'transfer_update',
    data: transfer,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  });
}

// Auto-complete pending transfers (relayer service)
setInterval(async () => {
  const transfers = bridge.getAllTransfers();
  const pending = transfers.filter(
    t => t.status === TransferStatus.PROVING || t.status === TransferStatus.RELAYING
  );

  for (const transfer of pending) {
    try {
      // Wait a bit before completing (simulate network confirmation)
      if (Date.now() - transfer.timestamp > 5000) {
        await bridge.completeTransfer(transfer.id);
        console.log(`Completed transfer: ${transfer.id}`);
      }
    } catch (error) {
      console.error(`Error completing transfer ${transfer.id}:`, error);
    }
  }
}, 10000); // Check every 10 seconds

const server = app.listen(PORT, () => {
  console.log(`🌉 Private Bridge Relayer running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
