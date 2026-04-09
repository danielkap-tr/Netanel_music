export interface MIDIEvent {
  status: number;
  data1: number;
  data2: number;
  channel: number;
  time: number; // Offset from recording start in ms
  type: 'note' | 'cc' | 'pitchbend' | 'program' | 'other';
  isDrum?: boolean;
  isTrigger?: boolean;
  bar?: number;
  track?: 'DRUMS' | 'BASS' | 'MELODY' | 'CHORDS';
  segment?: string;
  chord?: string;
  source: 'midi' | 'keyboard';
}

export class MIDIEngine {
  private access: any = null;
  private input: any = null;
  private output: any = null;
  private onEvent: ((event: MIDIEvent) => void) | null = null;
  private onStatusChange: ((status: string) => void) | null = null;
  private activeNotes: Set<number> = new Set();

  async init() {
    try {
      if (!navigator.requestMIDIAccess) {
        this.emitStatus("MIDI NOT SUPPORTED");
        throw new Error("MIDI not supported");
      }
      this.access = await (navigator as any).requestMIDIAccess({ sysex: true });
      this.access.onstatechange = (e: any) => {
        console.log("MIDI State Change:", e.port.name, e.port.state);
        this.autoSelect();
      };
      this.autoSelect();
    } catch (err) {
      this.emitStatus("PERMISSION DENIED");
      throw err;
    }
  }

  private autoSelect() {
    if (!this.access) return;
    
    // Auto-select input
    const inputs = Array.from(this.access.inputs.values());
    if (inputs.length === 0) {
      this.emitStatus("NO DEVICES FOUND");
    } else if (!this.input) {
      this.selectInput(0);
    }

    // Auto-select output
    const outputs = Array.from(this.access.outputs.values());
    if (outputs.length > 0 && !this.output) {
      this.selectOutput(0);
    }
  }

  selectInput(index: number) {
    if (!this.access) return;
    const inputs = Array.from(this.access.inputs.values()) as any[];
    if (this.input) {
      this.input.onmidimessage = null;
    }
    this.input = inputs[index];
    if (this.input) {
      this.input.onmidimessage = (msg: any) => this.handleMessage(msg);
      this.emitStatus(`INPUT CONNECTED: ${this.input.name}`);
    } else {
      this.emitStatus("INPUT CONNECTION FAILED");
    }
  }

  selectOutput(index: number) {
    if (!this.access) return;
    const outputs = Array.from(this.access.outputs.values()) as any[];
    this.output = outputs[index];
    if (this.output) {
      this.emitStatus(`OUTPUT CONNECTED: ${this.output.name}`);
    } else {
      this.emitStatus("OUTPUT CONNECTION FAILED");
    }
  }

  sendEvent(status: number, data1: number, data2: number, time?: number) {
    if (this.output) {
      // Use direct MIDI output scheduling
      this.output.send([status, data1, data2], time || 0);
    }
  }

  simulateMessage(status: number, data1: number, data2: number) {
    this.handleMessage({ data: [status, data1, data2] }, 'keyboard');
  }

  allNotesOff() {
    if (this.output) {
      for (let ch = 0; ch < 16; ch++) {
        this.output.send([0xB0 | ch, 123, 0]); // All Notes Off CC
      }
    }
  }

  setEventHandler(callback: (event: MIDIEvent) => void) {
    this.onEvent = callback;
  }

  setStatusHandler(callback: (status: string) => void) {
    this.onStatusChange = callback;
  }

  private emitStatus(status: string) {
    console.log(`MIDI Status: ${status}`);
    this.onStatusChange?.(status);
  }

  private handleMessage(msg: any, source: 'midi' | 'keyboard' = 'midi') {
    const [status] = msg.data;
    const now = performance.now();
    
    // MIDI Clock/Real-time messages
    if (status >= 0xF8) {
      if (status === 0xF8 && this.onEvent) {
         this.onEvent({ status: 0xF8, data1: 0, data2: 0, channel: 0, time: now, type: 'other', source: 'midi' });
      }
      return;
    }

    const channel = status & 0x0F;
    const messageType = status & 0xF0;
    
    let type: MIDIEvent['type'] = 'other';
    let data1 = msg.data[1] || 0;
    let data2 = msg.data[2] || 0;

    if (messageType === 0x90 || messageType === 0x80) {
      type = 'note';
      
      const isNoteOn = messageType === 0x90 && data2 > 0;
      if (isNoteOn) {
        this.activeNotes.add(data1);
      } else {
        if (!this.activeNotes.has(data1)) return;
        this.activeNotes.delete(data1);
      }
    }
    else if (messageType === 0xB0) type = 'cc';
    else if (messageType === 0xE0) type = 'pitchbend';
    else if (messageType === 0xC0) type = 'program';

    const event: MIDIEvent = {
      status,
      channel,
      data1,
      data2,
      time: now,
      type,
      isDrum: channel === 9,
      isTrigger: data1 >= 24 && data1 <= 31, // C1 to G1 (Control Range)
      source
    };

    this.onEvent?.(event);
  }

  getInputs(): string[] {
    if (!this.access) return [];
    return Array.from(this.access.inputs.values()).map((i: any) => i.name || "Unknown");
  }

  getOutputs(): string[] {
    if (!this.access) return [];
    return Array.from(this.access.outputs.values()).map((o: any) => o.name || "Unknown");
  }
}

export const midiEngine = new MIDIEngine();
