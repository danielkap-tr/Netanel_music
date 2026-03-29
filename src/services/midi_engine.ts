export interface MIDIEvent {
  status: number;
  data1: number;
  data2: number;
  channel: number;
  time: number; // Precision timestamp in ms
  type: 'note' | 'cc' | 'pitchbend' | 'program' | 'other';
  isDrum?: boolean;
  bar?: number;
  track?: 'DRUMS' | 'BASS' | 'MELODY' | 'CHORDS';
  segment?: string;
  chord?: string;
}

export class MIDIEngine {
  private access: any = null;
  private input: any = null;
  private onEvent: ((event: MIDIEvent) => void) | null = null;

  async init() {
    if (!navigator.requestMIDIAccess) throw new Error("MIDI not supported");
    this.access = await (navigator as any).requestMIDIAccess({ sysex: true });
    this.access.onstatechange = () => this.autoSelect();
    this.autoSelect();
  }

  private autoSelect() {
    const inputs = Array.from(this.access.inputs.values());
    if (inputs.length > 0 && !this.input) {
      this.selectInput(0);
    }
  }

  selectInput(index: number) {
    const inputs = Array.from(this.access.inputs.values()) as any[];
    if (this.input) this.input.onmidimessage = null;
    this.input = inputs[index];
    if (this.input) {
      this.input.onmidimessage = (msg: any) => this.handleMessage(msg);
    }
  }

  setEventHandler(callback: (event: MIDIEvent) => void) {
    this.onEvent = callback;
  }

  private handleMessage(msg: any) {
    const [status] = msg.data;
    const now = performance.now();
    
    // Ignore MIDI Clock/Real-time noise for now (will be handled by timing engine if needed)
    if (status >= 0xF8) {
      if (status === 0xF8 && this.onEvent) {
         this.onEvent({ status: 0xF8, data1: 0, data2: 0, channel: 0, time: now, type: 'other' });
      }
      return;
    }

    const channel = status & 0x0F;
    const messageType = status & 0xF0;
    
    let type: MIDIEvent['type'] = 'other';
    if (messageType === 0x90 || messageType === 0x80) type = 'note';
    else if (messageType === 0xB0) type = 'cc';
    else if (messageType === 0xE0) type = 'pitchbend';
    else if (messageType === 0xC0) type = 'program';

    const event: MIDIEvent = {
      status,
      channel,
      data1: msg.data[1] || 0,
      data2: msg.data[2] || 0,
      time: now,
      type,
      isDrum: channel === 9
    };

    this.onEvent?.(event);
  }

  getInputs(): string[] {
    if (!this.access) return [];
    return Array.from(this.access.inputs.values()).map((i: any) => i.name || "Unknown");
  }
}

export const midiEngine = new MIDIEngine();
