import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RotateCcw, Activity, Music, Keyboard, Play, Square, Settings } from 'lucide-react';
import { midiEngine } from '../services/midi_engine';
import { useStore } from '../store/useStore';
import { midiNoteToName } from '../utils/midi_utils';
import { playbackEngine } from '../services/playback_engine';

const MIDITape: React.FC = () => {
  const store = useStore();
  const [midiStatus, setMidiStatus] = useState<string>("מאתחל...");
  const [inputs, setInputs] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  
  const timelineRef = useRef<HTMLDivElement>(null);

  // 1. MIDI & Keyboard Failsafe (Simulation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      
      const segmentKeys: Record<string, string> = {
        '1': 'intro_1', '2': 'var_a', '3': 'var_b', '4': 'var_c', '5': 'var_d', '6': 'fill_a', '7': 'ending_1'
      };
      if (segmentKeys[key]) {
        store.switchSegment(segmentKeys[key]);
        return;
      }

      const noteMap: Record<string, number> = {
        'a': 60, 'w': 61, 's': 62, 'e': 63, 'd': 64, 'f': 65, 't': 66, 'g': 67, 'y': 68, 'h': 69, 'u': 70, 'j': 71, 'k': 72
      };
      if (noteMap[key]) {
        midiEngine.simulateMessage(0x90, noteMap[key], 100);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const noteMap: Record<string, number> = {
        'a': 60, 'w': 61, 's': 62, 'e': 63, 'd': 64, 'f': 65, 't': 66, 'g': 67, 'y': 68, 'h': 70, 'j': 71, 'k': 72
      };
      if (noteMap[key]) {
        midiEngine.simulateMessage(0x80, noteMap[key], 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [store]);

  // 2. MIDI Integration
  useEffect(() => {
    const init = async () => {
      try {
        midiEngine.setStatusHandler((status) => setMidiStatus(status));
        await midiEngine.init();
        setInputs(midiEngine.getInputs());
        midiEngine.setEventHandler((event) => {
          const state = useStore.getState();
          if (event.type === 'note') {
             state.updateActiveNote(event.data1, event.data2);
          }
          state.addEvent(event);
        });
      } catch (err) {
        setMidiStatus("שגיאת MIDI");
      }
    };
    init();
  }, []);

  // 3. Professional Timers (BPM-synced)
  useEffect(() => {
    let interval: any;
    if (store.recordingState === 'RECORDING') {
      interval = setInterval(() => {
        const now = performance.now();
        if (store.recordingStartTime) {
          const elapsedMs = now - store.recordingStartTime;
          const elapsedBeats = (elapsedMs / 1000) * (store.bpm / 60);
          
          setCurrentTime(elapsedMs / 1000);
          setCurrentBeat(elapsedBeats);
          
          // AUTO-SCROLL (FOLLOW PLAYHEAD) [100px per beat]
          if (timelineRef.current) {
            const playheadX = elapsedBeats * 80; // Scale: 80px per beat
            const containerWidth = timelineRef.current.clientWidth;
            if (playheadX > containerWidth / 2) {
               timelineRef.current.scrollLeft = playheadX - containerWidth / 2;
            }
          }
        }
      }, 20);
    } else {
      setCurrentTime(0);
      setCurrentBeat(0);
    }
    return () => clearInterval(interval);
  }, [store.recordingState, store.recordingStartTime, store.bpm]);

  // Dynamic Bar Grid Lines
  const barLines = useMemo(() => {
    const lines = [];
    const maxBars = Math.ceil(Math.max(currentBeat / 4 + 1, 32));
    for (let i = 0; i < maxBars; i++) {
        lines.push(i * 4); // Every 4 beats (1 bar)
    }
    return lines;
  }, [currentBeat]);

  return (
    <div className="midi-tape-container professional-layout" dir="rtl" style={{ 
      width: '1200px', minHeight: '95vh', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: '#000', color: 'white'
    }}>
      
      {/* HUD - פאנל ניטור מקצועי */}
      <header className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', padding: '1.2rem', alignItems: 'center' }}>
          <HUDItem label="סטטוס" value={translateState(store.recordingState)} color={store.recordingState === 'RECORDING' ? '#ef4444' : '#666'} icon={<Activity size={16}/>} />
          <HUDItem label="BPM" value={<input type="number" value={store.bpm} onChange={(e) => store.setBpm(parseInt(e.target.value))} className="bpm-input"/>} icon={<Settings size={14}/>} />
          <HUDItem label="תיבה | פעימה" value={`${Math.floor(currentBeat / 4) + 1} | ${Math.floor(currentBeat % 4) + 1}`} color="#3b82f6" />
          <HUDItem label="מונה תווים" value={store.events.length} color="#22c55e" />
          <HUDItem label="תו אחרון" value={store.lastNote ? `${midiNoteToName(store.lastNote.note)}` : '-'} color="#eab308" icon={<Keyboard size={16}/>} />
      </header>

      {/* TIMELINE - ציר זמן מוזיקלי (FORCE LTR) */}
      <section className="glass-panel timeline-window" ref={timelineRef} style={{ direction: 'ltr', overflowX: 'auto', position: 'relative', height: '220px', background: '#030303' }}>
          <div className="timeline-content" style={{ width: `${Math.max(currentBeat * 80 + 1000, 1200)}px`, height: '100%', position: 'relative' }}>
             
             {/* BAR GRID - קווי תיבות */}
             {barLines.map(beatIdx => (
                <div key={beatIdx} className="bar-line" style={{ left: beatIdx * 80 }}>
                    <span className="bar-label">{Math.floor(beatIdx / 4) + 1}</span>
                </div>
             ))}

             {/* BEAT GRID - קווי פעימות (Sub-grid) */}
             {Array.from({length: barLines.length * 4}).map((_, i) => (
                <div key={i} className="beat-line" style={{ left: i * 80 }}></div>
             ))}
             
             {/* NOTE BARS - שכבת המלבנים (PA700 Visuals) */}
             {store.events.map((ev, idx) => {
               if (ev.type !== 'note' || ev.beat === undefined || ev.durationBeat === undefined) return null;
               const left = ev.beat * 80;
               const width = Math.max(10, ev.durationBeat * 80 - 2); // Small gap between notes
               const top = Math.max(0, Math.min(160, (127 - ev.data1) * 1.5 + 20));
               
               return (
                 <div key={idx} className="note-bar" style={{ 
                    left, width, top, 
                    opacity: ev.opacity || 0.8,
                    background: ev.segment?.includes('fill') ? '#ef4444' : '#22c55e',
                    boxShadow: `0 0 10px ${ev.segment?.includes('fill') ? '#ef4444' : '#22c55e'}44`
                 }}></div>
               );
             })}

             {/* PLAYHEAD - סמן הזמן */}
             <div className="playhead" style={{ left: currentBeat * 80 }}></div>
          </div>
      </section>

      {/* CONTROLS - פקודות הפעלה */}
      <section style={{ display: 'flex', gap: '2rem', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => store.setRecordingState(store.recordingState === 'RECORDING' ? 'IDLE' : 'RECORDING')} 
                  className={`rec-btn-main ${store.recordingState === 'RECORDING' ? 'active' : ''}`}>
             <span className="rec-dot"></span>
             {store.recordingState === 'RECORDING' ? 'עצור' : 'הקלטה'}
          </button>
          
          <div className="active-notes-visual">
            {Object.keys(store.activeNotes).length === 0 ? <span style={{color:'#333'}}>מחכה ל-MIDI...</span> : 
             Object.keys(store.activeNotes).map(n => <div key={n} className="active-note-indicator"></div>)}
          </div>
      </section>

      {/* PA700 MATRIX - מטריצת קורג */}
      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.2rem' }}>
         <ArrangerColumn label="פתיחות (INTROS)" items={['intro_1', 'intro_2', 'intro_3']} keys={['1']} />
         <ArrangerColumn label="בתים (VARIATIONS)" items={['var_a', 'var_b', 'var_c', 'var_d']} keys={['2','3','4','5']} />
         <ArrangerColumn label="מעברים (FILLS)" items={['fill_a', 'fill_b', 'fill_c', 'fill_d']} keys={['6']} />
         <ArrangerColumn label="הפסקה (BREAK)" items={['break']} keys={['B']} />
         <ArrangerColumn label="סיומות (ENDINGS)" items={['ending_1', 'ending_2', 'ending_3']} keys={['7']} />
      </main>

      {/* SYSTEM PANEL */}
      <footer className="glass-panel" style={{ padding: '0.8rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#444', fontWeight: 900 }}>דגם: KORG PA700</span>
            <div className="status-badge connected">{midiStatus}</div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={() => store.clearRecording()} className="icon-btn-reset"><RotateCcw size={16}/> אפס הכל</button>
          </div>
      </footer>

      <style>{`
        .glass-panel { background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 1rem; }
        .rec-btn-main { display: flex; align-items: center; gap: 10px; background: #111; border: 2px solid #333; border-radius: 50px; padding: 0.8rem 2.8rem; color: #fff; font-size: 1.1rem; font-weight: 900; cursor: pointer; transition: 0.3s; }
        .rec-btn-main.active { border-color: #ef4444; background: #1a0000; color: #ef4444; }
        .rec-dot { width: 10px; height: 10px; background: #ef4444; border-radius: 50%; display: inline-block; }
        .rec-btn-main.active .rec-dot { animation: blink 0.8s infinite; }
        
        @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; } }
        
        .timeline-window::-webkit-scrollbar { height: 8px; }
        .timeline-window::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 4px; }
        
        .playhead { position: absolute; top: 0; bottom: 0; width: 2px; background: #3b82f6; z-index: 100; box-shadow: 0 0 15px #3b82f6; pointer-events: none; }
        .note-bar { position: absolute; height: 12px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.1); pointer-events: none; }
        
        .bar-line { position: absolute; top: 0; bottom: 0; width: 1px; background: #222; z-index: 1; }
        .beat-line { position: absolute; top: 0; bottom: 0; width: 1px; background: #111; opacity: 0.3; }
        .bar-label { position: absolute; top: 5px; left: 5px; font-size: 0.65rem; color: #333; font-weight: 900; }

        .active-notes-visual { display: flex; gap: 1rem; align-items: center; background: #080808; padding: 0.8rem 2rem; border-radius: 12px; border: 1px solid #111; height: 45px; }
        .active-note-indicator { width: 12px; height: 12px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 10px #22c55e; animation: pop 0.2s ease-out; }
        @keyframes pop { from { transform: scale(0.5); } to { transform: scale(1); } }
        
        .bpm-input { background: none; border: none; color: #3b82f6; font-size: 1.1rem; font-weight: 900; width: 50px; text-align: center; }
        .status-badge { font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 5px; color: #666; background: #111; }
        .status-badge.connected { color: #22c55e; background: rgba(34, 197, 94, 0.1); }

        .matrix-btn { 
          width: 100%; padding: 1.4rem 1rem; border-radius: 12px; border: 1px solid #1a1a1a; 
          background: #080808; color: #fff; font-weight: 800; font-size: 0.85rem; cursor: pointer; 
          transition: 0.2s; position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px;
        }
        .matrix-btn:hover { border-color: #333; transform: translateY(-3px); background: #0f0f0f; }
        .matrix-btn .key-badge { position: absolute; top: 8px; right: 10px; font-size: 0.6rem; color: #333; }
        .matrix-btn .play-action { position: absolute; top: 8px; left: 10px; opacity: 0; transition: 0.2s; color: #3b82f6; }
        .matrix-btn:hover .play-action { opacity: 1; }

        .matrix-btn.status-active     { border-color: #3b82f6; box-shadow: 0 0 15px rgba(59, 130, 246, 0.1); }
        .matrix-btn.status-recording  { border-color: #ef4444; animation: blink-border 1s infinite; }
        .matrix-btn.status-completed  { border-color: #22c55e; }
        
        @keyframes blink-border { 0% { border-color: #ef4444; } 50% { border-color: #333; } 100% { border-color: #ef4444; } }
        
        .icon-btn-reset { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 5px; padding: 6px 12px; font-size: 0.75rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 5px; }
      `}</style>
    </div>
  );
};

// HELPERS
const HUDItem = ({ label, value, color, icon, hide }: any) => {
  if (hide) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderRight: '1px solid #1a1a1a', paddingLeft: '1.2rem' }}>
      <div style={{ fontSize: '0.6rem', color: '#444', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: color || 'white' }}>{value}</div>
    </div>
  );
};

const ArrangerColumn = ({ label, items, keys }: any) => {
  const store = useStore();
  const isRecording = store.recordingState === 'RECORDING';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <label style={{ fontSize: '0.65rem', color: '#444', fontWeight: 900, letterSpacing: '0.5px' }}>{label}</label>
      {items.map((it: string, idx: number) => {
        const stats = store.segmentStats[it] || { status: 'EMPTY', eventCount: 0 };
        const statusClass = `status-${stats.status.toLowerCase()}`;
        const icons: any = { 'COMPLETED': '✅', 'RECORDING': '🔴', 'PARTIAL': '🟡', 'ACTIVE': '🔵', 'EMPTY': '⚪' };

        return (
          <button 
            key={it} 
            onClick={() => isRecording ? store.switchSegment(it) : playbackEngine.playSegment(it)}
            className={`matrix-btn ${statusClass}`}
          >
            <span className="key-badge">[{keys[idx]}]</span>
            {!isRecording && stats.eventCount > 0 && <span className="play-action"><Play size={14} fill="currentColor"/></span>}
            <span style={{ fontSize: '1.2rem' }}>{icons[stats.status]}</span>
            <span>{translateSegment(it)}</span>
            {stats.eventCount > 0 && <span style={{ fontSize: '0.65rem', opacity: 0.5, color: '#3b82f6' }}>{stats.eventCount} notes</span>}
          </button>
        );
      })}
    </div>
  );
};

const translateState = (s: string) => {
    if (s === 'RECORDING') return 'הקלטה פעילה';
    if (s === 'IDLE') return 'מצב השמעה';
    return '-';
};

const translateSegment = (id: string | null) => {
    if (!id) return '';
    const map: Record<string, string> = {
        'intro_1': 'פתיחה 1', 'intro_2': 'פתיחה 2', 'intro_3': 'פתיחה 3',
        'var_a': 'בית א (A)', 'var_b': 'בית ב (B)', 'var_c': 'בית ג (C)', 'var_d': 'בית ד (D)',
        'fill_a': 'מעבר א', 'fill_b': 'מעבר ב', 'fill_c': 'מעבר ג', 'fill_d': 'מעבר ד',
        'break': 'הפסקה (Break)', 
        'ending_1': 'סיום 1', 'ending_2': 'סיום 2', 'ending_3': 'סיום 3'
    };
    return map[id] || id;
};

export default MIDITape;
