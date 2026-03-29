import { MIDIEvent } from './midi_engine';

export interface RhythmDNA {
  energy: number;
  complexity: number;
  groove: number;
  confidence: number;
  hasSwing: boolean;
  kickPattern: '4-ON-FLOOR' | 'SYNCOPATED' | 'SPARSE' | 'UNKNOWN';
  snarePattern: '2&4' | 'OFFBEAT' | 'GHOST-NOTES' | 'NONE';
  density: 'LOW' | 'MEDIUM' | 'HIGH';
}

export const STYLE_MAP: Record<string, Partial<RhythmDNA> & { bpmRange: [number, number] }> = {
  'HASIDIC': {
    energy: 0.9,
    hasSwing: true,
    kickPattern: 'SYNCOPATED',
    bpmRange: [120, 145]
  },
  'EDM': {
    energy: 0.8,
    hasSwing: false,
    kickPattern: '4-ON-FLOOR',
    bpmRange: [124, 130]
  },
  'ROCK': {
    energy: 0.7,
    snarePattern: '2&4',
    bpmRange: [90, 120]
  }
};

export function extractRhythmDNA(events: MIDIEvent[], bpm: number): RhythmDNA {
  if (events.length === 0) return { energy: 0, complexity: 0, groove: 0, confidence: 0, hasSwing: false, kickPattern: 'UNKNOWN', snarePattern: 'NONE', density: 'LOW' };
  
  const drums = events.filter(e => e.channel === 9 && e.type === 'note' && (e.status & 0xF0) === 0x90);
  
  // Kick Detection
  const kicks = drums.filter(e => e.data1 === 35 || e.data1 === 36);
  let kickPattern: RhythmDNA['kickPattern'] = 'UNKNOWN';
  if (kicks.length >= 4) kickPattern = '4-ON-FLOOR';
  else if (kicks.length > 0) kickPattern = 'SYNCOPATED';
  
  // Snare Detection
  const snares = drums.filter(e => e.data1 === 38 || e.data1 === 40);
  let snarePattern: RhythmDNA['snarePattern'] = 'NONE';
  if (snares.length > 0) snarePattern = '2&4';
  
  // Density calculation
  const densityVal = events.length / 32; // events per beat/bar heuristic
  const density: RhythmDNA['density'] = densityVal > 2 ? 'HIGH' : densityVal > 0.5 ? 'MEDIUM' : 'LOW';

  return {
    energy: Math.min(1, densityVal / 5),
    complexity: Math.min(1, events.length / 100),
    groove: 0.5,
    confidence: 0.85,
    hasSwing: false,
    kickPattern,
    snarePattern,
    density
  };
}

export function getTrackTypePro(channel: number, note: number, velocity: number): 'DRUMS' | 'BASS' | 'MELODY' | 'CHORDS' {
  if (channel === 9) return 'DRUMS';
  if (note < 48) return 'BASS';
  if (velocity > 0 && velocity < 50) return 'CHORDS'; // Heuristic: softer polyphonic background
  return 'MELODY';
}

export function validateSegment(events: MIDIEvent[], bpm: number): boolean {
  // Must align to full bars (simplification)
  return events.length > 0;
}
