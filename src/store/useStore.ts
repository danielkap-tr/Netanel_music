import { create } from 'zustand';
import { MIDIEvent } from '../services/midi_engine';

interface ArrangementState {
  recordingState: 'IDLE' | 'COUNTDOWN' | 'RECORDING' | 'PLAYING';
  bpm: number;
  isClockSynced: boolean;
  currentSegment: string;
  nextSegment: string | null;
  currentChord: { root: string; type: string } | null;
  tracks: {
    DRUMS: MIDIEvent[];
    BASS: MIDIEvent[];
    MELODY: MIDIEvent[];
    CHORDS: MIDIEvent[];
  };
  events: MIDIEvent[];
  history: any[];
  
  // Actions
  setRecordingState: (state: ArrangementState['recordingState']) => void;
  setBpm: (bpm: number) => void;
  setClockSynced: (synced: boolean) => void;
  setCurrentSegment: (segment: string) => void;
  setNextSegment: (segment: string | null) => void;
  handleTick: (bar: number, beat: number) => void;
  setCurrentChord: (chord: ArrangementState['currentChord']) => void;
  addEvent: (event: MIDIEvent) => void;
  clearEvents: () => void;
  undo: () => void;
}

export const useStore = create<ArrangementState>((set, get) => ({
  recordingState: 'IDLE',
  bpm: 65,
  isClockSynced: false,
  currentSegment: 'VARIATION A',
  nextSegment: null,
  currentChord: null,
  tracks: {
    DRUMS: [],
    BASS: [],
    MELODY: [],
    CHORDS: [],
  },
  events: [],
  history: [],

  setRecordingState: (state) => set({ recordingState: state }),
  setBpm: (bpm) => set({ bpm }),
  setClockSynced: (synced) => set({ isClockSynced: synced }),
  setCurrentSegment: (segment) => set({ currentSegment: segment }),
  setNextSegment: (segment) => set({ nextSegment: segment }),
  
  handleTick: (bar, beat) => {
    const { nextSegment, currentSegment } = get();
    if (beat === 1) { // On the downbeat
      if (nextSegment) {
        set({ currentSegment: nextSegment, nextSegment: null });
      } else if (currentSegment === 'FILL') {
        // Auto-return from FILL to VARIATION A
        set({ currentSegment: 'VARIATION A' });
      }
    }
  },

  setCurrentChord: (chord) => set({ currentChord: chord }),
  addEvent: (event) => set((state) => ({ 
    events: [...state.events, event] 
  })),
  clearEvents: () => set({ events: [], tracks: { DRUMS: [], BASS: [], MELODY: [], CHORDS: [] } }),
  undo: () => set((state) => ({
    events: state.events.slice(0, -1)
  })),
}));
