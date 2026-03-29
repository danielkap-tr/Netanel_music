// @ts-ignore
import MidiWriter from 'midi-writer-js';
import { MIDIEvent } from '../services/midi_engine';

export function exportToStyle(session: any, dna: any): string {
  const styleData = {
    version: "1.0",
    tempo: session.tempo,
    time_signature: "4/4",
    structure: session.segments || {},
    tracks: session.events || [],
    style_dna: dna,
    created_at: new Date().toISOString()
  };
  return JSON.stringify(styleData, null, 2);
}

export function normalizeForAI(events: MIDIEvent[]): MIDIEvent[] {
  // Clean noise and normalize timing for AI consumption
  return events.filter(e => e.type !== 'other').map(e => ({
    ...e,
    time: Math.round(e.time) // Deterministic cleanup
  }));
}

export function generateMIDIFile(events: MIDIEvent[], bpm: number): Uint8Array {
  const track = new MidiWriter.Track();
  track.setTempo(bpm);
  track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: 1 })); // Grand Piano default

  const drumTrack = new MidiWriter.Track();
  drumTrack.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: 1 }));

  events.forEach(event => {
    const { status, data1, data2, type, channel, time } = event;
    const tick = (time * (bpm / 60) * 128) / 1000; // Simplified tick calculation

    if (type === 'note') {
      const isOn = (status & 0xF0) === 0x90 && data2 > 0;
      const targetTrack = channel === 9 ? drumTrack : track;
      
      if (isOn) {
        targetTrack.addEvent(new MidiWriter.NoteOnEvent({
          pitch: data1,
          velocity: data2,
          tick: Math.max(0, Math.round(tick)),
          channel: channel + 1
        }));
      } else {
        targetTrack.addEvent(new MidiWriter.NoteOffEvent({
          pitch: data1,
          velocity: data2,
          tick: Math.max(0, Math.round(tick)),
          channel: channel + 1
        }));
      }
    }
  });

  const write = new MidiWriter.Writer([track, drumTrack]);
  return write.buildFile();
}

export function downloadFile(content: BlobPart, fileName: string, contentType: string) {
  const a = document.createElement("a");
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
}
