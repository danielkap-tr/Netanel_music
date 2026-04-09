import { create } from 'zustand';
import { MIDIEvent } from '../services/midi_engine';

export interface RecordingSegment {
  type: string;
  status: 'EMPTY' | 'ACTIVE' | 'RECORDING' | 'PARTIAL' | 'COMPLETED';
  eventCount: number;
  loop?: boolean;
}

interface PendingNote {
    note: number;
    channel: number;
    startTime: number;
    startBeat: number;
    velocity: number;
    segmentId: string;
}

interface ArrangementState {
  isDebugMode: boolean;
  recordingState: 'IDLE' | 'RECORDING' | 'STOPPED';
  playbackState: 'IDLE' | 'PLAYING';
  appMode: 'BEGINNER' | 'ADVANCED';
  view: 'WELCOME' | 'WIZARD' | 'WORKBENCH';
  inputSource: 'RECORD' | 'UPLOAD' | 'AUDIO' | null;
  keyboardModel: string | null;
  musicalStyle: string | null;
  isAnalyzing: boolean;
  events: (MIDIEvent & { beat?: number; durationBeat?: number; durationMs?: number; opacity?: number })[];
  segmentStats: Record<string, RecordingSegment>;
  activeSegmentId: string | null;
  recordingStartTime: number | null;
  currentSegmentStartTime: number | null;
  activeNotes: Record<number, number>; 
  lastNote: { note: number; velocity: number } | null;
  pendingNotes: Record<string, PendingNote>;

  playCurrentSegment: { group: string, index: number } | null;
  playNextSegment: { group: string, index: number } | null;

  bpm: number;
  currentChord: { root: string; type: string } | null;
  
  // Actions
  setIsDebugMode: (isDebug: boolean) => void;
  setRecordingState: (state: ArrangementState['recordingState']) => void;
  setAppMode: (mode: ArrangementState['appMode']) => void;
  setView: (view: ArrangementState['view']) => void;
  setInputSource: (source: ArrangementState['inputSource']) => void;
  setKeyboardModel: (model: string) => void;
  setMusicalStyle: (style: string) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  loadEvents: (events: any[], merge?: boolean) => void;
  addEvent: (event: MIDIEvent) => void;
  clearRecording: () => void;
  
  switchSegment: (id: string) => void;
  updateActiveNote: (note: number, velocity: number) => void;
  setPlaybackState: (state: ArrangementState['playbackState']) => void;
  setPlayCurrentSegment: (seg: { group: string, index: number } | null) => void;
  setPlayNextSegment: (seg: { group: string, index: number } | null) => void;
  setBpm: (bpm: number) => void;
}

export const useStore = create<ArrangementState>((set, get) => ({
  isDebugMode: true,
  recordingState: 'IDLE',
  playbackState: 'IDLE',
  appMode: 'BEGINNER',
  view: 'WELCOME',
  inputSource: null,
  keyboardModel: null,
  musicalStyle: null,
  isAnalyzing: false,
  events: [],
  segmentStats: {
    'intro_1': { type: 'intro', status: 'EMPTY', eventCount: 0, loop: false },
    'intro_2': { type: 'intro', status: 'EMPTY', eventCount: 0, loop: false },
    'intro_3': { type: 'intro', status: 'EMPTY', eventCount: 0, loop: false },
    'var_a': { type: 'var', status: 'EMPTY', eventCount: 0, loop: true },
    'var_b': { type: 'var', status: 'EMPTY', eventCount: 0, loop: true },
    'var_c': { type: 'var', status: 'EMPTY', eventCount: 0, loop: true },
    'var_d': { type: 'var', status: 'EMPTY', eventCount: 0, loop: true },
    'fill_a': { type: 'fill', status: 'EMPTY', eventCount: 0, loop: false },
    'fill_b': { type: 'fill', status: 'EMPTY', eventCount: 0, loop: false },
    'fill_c': { type: 'fill', status: 'EMPTY', eventCount: 0, loop: false },
    'fill_d': { type: 'fill', status: 'EMPTY', eventCount: 0, loop: false },
    'break': { type: 'break', status: 'EMPTY', eventCount: 0, loop: false },
    'ending_1': { type: 'ending', status: 'EMPTY', eventCount: 0, loop: false },
    'ending_2': { type: 'ending', status: 'EMPTY', eventCount: 0, loop: false },
    'ending_3': { type: 'ending', status: 'EMPTY', eventCount: 0, loop: false },
  },
  activeSegmentId: 'var_a',
  recordingStartTime: null,
  currentSegmentStartTime: null,
  activeNotes: {},
  lastNote: null,
  pendingNotes: {},
  
  playCurrentSegment: null,
  playNextSegment: null,

  bpm: 120,
  currentChord: null,

  setIsDebugMode: (isDebug) => set({ isDebugMode: isDebug }),
  setAppMode: (mode) => set({ appMode: mode }),
  setView: (view) => set({ view }),
  setInputSource: (source) => set({ inputSource: source }),
  setKeyboardModel: (model) => set({ keyboardModel: model }),
  setMusicalStyle: (style) => set({ musicalStyle: style }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  loadEvents: (newEvents, merge) => set((state) => ({ 
    events: merge ? [...state.events, ...newEvents] : newEvents 
  })),
  
  setRecordingState: (state) => {
    if (state === 'RECORDING') {
      // START RECORDING IN CURRENT SEGMENT
      const currentId = get().activeSegmentId || 'var_a';
      set({ 
        events: [],
        recordingStartTime: performance.now(),
        activeSegmentId: currentId,
        currentSegmentStartTime: performance.now(),
        pendingNotes: {}
      });
      // Ensure current segment is ACTIVE (🔵)
      set((state) => {
        const newStats = { ...state.segmentStats };
        // Reset all segments to EMPTY before starting a new recording
        Object.keys(newStats).forEach(id => {
            newStats[id].status = 'EMPTY';
            newStats[id].eventCount = 0;
        });
        newStats[currentId].status = 'ACTIVE';
        return { segmentStats: newStats };
      });
    } else if (state === 'IDLE' && get().recordingState === 'RECORDING') {
      // FINAL SWEEP ON STOP
      const { pendingNotes, recordingStartTime, bpm, activeSegmentId } = get();
      const now = performance.now();
      const relativeTime = now - (recordingStartTime || 0);
      const currentBeat = (relativeTime / 1000) * (bpm / 60);

      set((state) => {
        const newStats = { ...state.segmentStats };
        const newEvents = [...state.events];
        
        // CLOSE ALL PENDING NOTES
        Object.entries(pendingNotes).forEach(([key, start]) => {
          if (!start) return;
          const durationMs = relativeTime - start.startTime;
          const durationBeat = currentBeat - start.startBeat;
          
          newEvents.push({
            status: 0x80 | start.channel, // Fake Note Off
            data1: start.note,
            data2: 0,
            channel: start.channel,
            time: start.startTime,
            beat: start.startBeat,
            durationMs,
            durationBeat,
            opacity: start.velocity / 127,
            segment: activeSegmentId || 'var_a',
            type: 'note',
            source: 'keyboard'
          });
          
          if (activeSegmentId) {
            newStats[activeSegmentId].eventCount++;
            newStats[activeSegmentId].status = 'RECORDING';
          }
        });

        Object.keys(newStats).forEach(id => {
          if (newStats[id].eventCount >= 5) {
            newStats[id].status = 'COMPLETED';
          }
        });
        
        return { segmentStats: newStats, events: newEvents, pendingNotes: {} };
      });
    }
    set({ recordingState: state });
  },

  addEvent: (event) => {
    const { recordingState, recordingStartTime, activeSegmentId, bpm, pendingNotes } = get();
    if (recordingState !== 'RECORDING' || !recordingStartTime || !activeSegmentId) return;

    const currentTime = performance.now();
    const relativeTime = currentTime - recordingStartTime;
    const currentBeat = (relativeTime / 1000) * (bpm / 60);
    
    // Note Pairing (Key = channel_note)
    const note = event.data1;
    const channel = event.channel || 0;
    const noteKey = `${channel}_${note}`;

    if (event.type === 'note') {
        if (event.data2 > 0) {
            // Note On
            set((state) => ({
                pendingNotes: {
                    ...state.pendingNotes,
                    [noteKey]: { 
                        note, channel, 
                        startTime: relativeTime, 
                        startBeat: currentBeat, 
                        velocity: event.data2,
                        segmentId: activeSegmentId
                    }
                }
            }));
        } else {
            // Note Off
            const start = pendingNotes[noteKey];
            if (start) {
                const durationMs = relativeTime - start.startTime;
                const durationBeat = currentBeat - start.startBeat;
                
                const noteEvent = { 
                    ...event, 
                    time: start.startTime, 
                    beat: start.startBeat, 
                    durationMs, 
                    durationBeat, 
                    opacity: start.velocity / 127,
                    segment: start.segmentId 
                };

                set((state) => {
                    const newStats = { ...state.segmentStats };
                    const segId = start.segmentId;
                    if (newStats[segId]) {
                        newStats[segId].eventCount++;
                        newStats[segId].status = 'RECORDING';
                    }
                    return {
                        events: [...state.events, noteEvent],
                        segmentStats: newStats,
                        lastNote: { note, velocity: start.velocity },
                        pendingNotes: { ...state.pendingNotes, [noteKey]: undefined as any }
                    };
                });
            }
        }
    }
 else {
        // Other events (clock etc)
        const taggedEvent = { ...event, time: relativeTime, beat: currentBeat, segment: activeSegmentId };
        set((state) => ({ events: [...state.events, taggedEvent] }));
    }
  },

  updateActiveNote: (note, velocity) => {
    set((state) => {
      const newNotes = { ...state.activeNotes };
      if (velocity === 0) {
        delete newNotes[note];
      } else {
        newNotes[note] = velocity;
      }
      return { activeNotes: newNotes };
    });
  },

  clearRecording: () => set({ 
    events: [],
    segmentStats: {
      intro: { type: 'intro', status: 'EMPTY', eventCount: 0 },
      var_a: { type: 'var_a', status: 'EMPTY', eventCount: 0 },
      var_b: { type: 'var_b', status: 'EMPTY', eventCount: 0 },
      var_c: { type: 'var_c', status: 'EMPTY', eventCount: 0 },
      var_d: { type: 'var_d', status: 'EMPTY', eventCount: 0 },
      fill: { type: 'fill', status: 'EMPTY', eventCount: 0 },
      ending: { type: 'ending', status: 'EMPTY', eventCount: 0 },
    },
    activeSegmentId: null,
    activeNotes: {}
  }),

  switchSegment: (id) => {
    const { activeSegmentId, segmentStats } = get();
    const now = performance.now();

    set((state) => {
      const newStats = { ...state.segmentStats };
      
      // 1. Transition previous segment
      if (activeSegmentId && newStats[activeSegmentId]) {
        const prev = newStats[activeSegmentId];
        if (prev.eventCount >= 5) {
          prev.status = 'COMPLETED'; // 🟢
        } else if (prev.eventCount > 0) {
          prev.status = 'PARTIAL'; // 🟡
        } else {
          prev.status = 'EMPTY'; // ⚪ (Ghost segment check)
        }
      }

      // 2. Initialize new segment
      if (newStats[id]) {
        newStats[id].status = 'ACTIVE'; // 🔵
      }

      return {
        activeSegmentId: id,
        segmentStats: newStats,
        currentSegmentStartTime: now
      };
    });
  },

  setPlaybackState: (state) => set({ playbackState: state }),
  setPlayCurrentSegment: (seg) => set({ playCurrentSegment: seg }),
  setPlayNextSegment: (seg) => set({ playNextSegment: seg }),

  setBpm: (bpm) => set({ bpm }),
}));
