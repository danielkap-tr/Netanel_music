import { MIDIEvent } from './midi_engine';

export interface SessionData {
  id: string;
  version: string;
  tempo: number;
  time_signature: string;
  events: MIDIEvent[];
  style: {
    text: string;
    parsed: any;
  };
  created_at: string;
}

export interface StorageProvider {
  saveSession(session: SessionData): Promise<void>;
  loadSession(id: string): Promise<SessionData | null>;
  listSessions(): Promise<string[]>;
}

export class LocalStorageProvider implements StorageProvider {
  async saveSession(session: SessionData): Promise<void> {
    const sessions = JSON.parse(localStorage.getItem('midi_sessions') || '{}');
    sessions[session.id] = session;
    localStorage.setItem('midi_sessions', JSON.stringify(sessions));
  }

  async loadSession(id: string): Promise<SessionData | null> {
    const sessions = JSON.parse(localStorage.getItem('midi_sessions') || '{}');
    return sessions[id] || null;
  }

  async listSessions(): Promise<string[]> {
    const sessions = JSON.parse(localStorage.getItem('midi_sessions') || '{}');
    return Object.keys(sessions);
  }
}

export const storage = new LocalStorageProvider();
