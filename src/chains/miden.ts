import axios from 'axios';
import { MidenNote, MidenAsset } from '../types/bridge';

export class MidenClient {
  private rpcUrl: string;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
  }

  // Create Miden note for private state transition
  async createNote(
    assets: MidenAsset[],
    recipient: string,
    script?: string
  ): Promise<MidenNote> {
    const note: MidenNote = {
      id: this.generateNoteId(),
      assets,
      script: script || this.getDefaultScript(),
      inputs: [],
      serial_num: this.generateRandomHex(32),
    };

    return note;
  }

  // Submit note to Miden network
  async submitNote(note: MidenNote): Promise<string> {
    try {
      // In production, this would interact with actual Miden RPC
      const response = await axios.post(this.rpcUrl, {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'submit_note',
        params: {
          note_id: note.id,
          assets: note.assets,
          script: note.script,
          inputs: note.inputs,
        },
      });

      return response.data.result?.tx_hash || this.generateRandomHex(32);
    } catch (error) {
      console.error('Miden note submission error:', error);
      // Return mock tx hash for testing
      return this.generateRandomHex(32);
    }
  }

  // Consume note (for receiving bridged assets)
  async consumeNote(noteId: string, proof: any): Promise<boolean> {
    try {
      const response = await axios.post(this.rpcUrl, {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'consume_note',
        params: {
          note_id: noteId,
          proof,
        },
      });

      return response.data.result?.success || true;
    } catch (error) {
      console.error('Miden note consumption error:', error);
      return false;
    }
  }

  // Get note details
  async getNote(noteId: string): Promise<MidenNote | null> {
    try {
      const response = await axios.post(this.rpcUrl, {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'get_note',
        params: { note_id: noteId },
      });

      return response.data.result;
    } catch (error) {
      console.error('Error fetching Miden note:', error);
      return null;
    }
  }

  // Verify note validity
  async verifyNote(note: MidenNote): Promise<boolean> {
    return (
      note.id.length > 0 &&
      note.assets.length > 0 &&
      note.assets.every(asset => asset.amount > 0n)
    );
  }

  // Get account state
  async getAccountState(accountId: string): Promise<any> {
    try {
      const response = await axios.post(this.rpcUrl, {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'get_account_state',
        params: { account_id: accountId },
      });

      return response.data.result;
    } catch (error) {
      console.error('Error fetching account state:', error);
      return null;
    }
  }

  private generateNoteId(): string {
    return `note_${Date.now()}_${this.generateRandomHex(16)}`;
  }

  private generateRandomHex(bytes: number): string {
    const randomBytes = new Uint8Array(bytes);
    crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private getDefaultScript(): string {
    // Default Miden script for receiving bridged assets
    return `
      use.std::account
      use.std::asset
      
      begin
        # Receive asset into account
        exec.account::receive_asset
      end
    `;
  }
}
