import React, { useState, useEffect, useRef } from 'react';
import { Square, Cpu, Music, Trash2, Activity, Download, Tag, User, Settings2, Volume2, VolumeX, Play, RotateCcw } from 'lucide-react';
import { midiEngine, MIDIEvent } from '../services/midi_engine';
import { timingEngine } from '../services/timing_engine';
import { useStore } from '../store/useStore';
import { getTrackTypePro, extractRhythmDNA } from '../services/processing_layer';
import { midiNoteToName } from '../utils/midi_utils';
import { detectChord } from '../utils/chord_analyzer';
import { exportToStyle, downloadFile } from '../services/midi_export';

const MIDITape: React.FC = () => {
  const store = useStore();
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState("מוכן");
  const [pulse, setPulse] = useState(false);
  const [uiMode, setUiMode] = useState<'BEGINNER' | 'PRO'>(() => {
    return (localStorage.getItem('midi_ui_mode') as 'BEGINNER' | 'PRO') || 'PRO';
  });
  
  const tapTimes = useRef<number[]>([]);

  useEffect(() => {
    localStorage.setItem('midi_ui_mode', uiMode);
  }, [uiMode]);

  // Initialize MIDI & Timing
  useEffect(() => {
    const init = async () => {
      try {
        await midiEngine.init();
        await timingEngine.init();
        
        midiEngine.setEventHandler((event) => {
          if (event.status === 0xF8) {
            setPulse(true);
            setTimeout(() => setPulse(false), 50);
            return;
          }

          if (store.recordingState === 'RECORDING') {
            const now = timingEngine.getCurrentTime();
            // Process and add to store
            const track = getTrackTypePro(event.channel, event.data1, event.data2);
            const bar = Math.ceil(now / (60 / store.bpm) / 4) || 1;
            
            store.addEvent({ 
              ...event, 
              bar, 
              track, 
              segment: store.currentSegment,
              chord: store.currentChord ? `${store.currentChord.root}${store.currentChord.type}` : undefined
            });
          }

          // Visual Feedback & Chord Detection
          if (event.type === 'note') {
            const { status, data1, data2, channel } = event;
            if ((status & 0xF0) === 0x90 && data2 > 0) {
              setActiveNotes(prev => {
                const next = new Set(prev).add(data1);
                if (channel !== 9) {
                  const chord = detectChord(Array.from(next));
                  if (chord) store.setCurrentChord(chord);
                }
                return next;
              });
            } else {
              setActiveNotes(prev => {
                const next = new Set(prev);
                next.delete(data1);
                return next;
              });
            }
          }
        });
      } catch (err) {
        setStatus("שגיאה במערכת ה-MIDI");
      }
    };
    init();
  }, [store.recordingState, store.bpm, store.currentSegment, store.currentChord]);

  const handleToggleRecord = () => {
    if (store.recordingState === 'IDLE') {
      store.setRecordingState('RECORDING');
      timingEngine.start((bar, beat, time) => {
        store.handleTick(bar, beat);
      });
      setStatus("מקליט...");
    } else {
      store.setRecordingState('IDLE');
      timingEngine.stop();
      setStatus("נעצר");
      
      // Feature extraction after recording
      const dna = extractRhythmDNA(store.events, store.bpm);
      console.log("Rhythm DNA:", dna);
    }
  };

  const handleExport = async () => {
    const dna = extractRhythmDNA(store.events, store.bpm);
    const style = exportToStyle({ 
      events: store.events, 
      bpm: store.bpm, 
      segments: { /* Add segment boundaries here */ } 
    }, dna);
    downloadFile(style, `סגנון_נתנאל_${Date.now()}.style`, 'application/json');
  };

  const renderTimeline = () => {
    const maxBar = Math.max(8, store.events.length > 0 ? Math.max(...store.events.map(e => e.bar || 0)) : 0);
    const bars = Array.from({ length: maxBar }, (_, i) => i + 1);

    return (
      <div className="timeline-outer glass" style={{ padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
           <h3 style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ציר זמן מוזיקלי (LTR)</h3>
           <div style={{ fontSize: '0.6rem', color: 'var(--accent)' }}>תיבה נוכחית: --</div>
        </div>
        
        {/* Force LTR for music timeline */}
        <div className="timeline-scroll" dir="ltr" style={{ overflowX: 'auto', display: 'flex', gap: '4px' }}>
          <div style={{ width: '80px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '2.5rem', textAlign: 'left' }}>
            {['DRUMS', 'BASS', 'MELODY', 'CHORDS'].map(t => (
              <div key={t} style={{ fontSize: '0.55rem', fontWeight: 900, color: 'var(--text-secondary)', height: '40px', display: 'flex', alignItems: 'center' }}>
                {t}
              </div>
            ))}
          </div>

          {bars.map(bar => {
            const barChords = Array.from(new Set(store.events.filter(e => e.bar === bar && e.chord).map(e => e.chord)));
            return (
              <div key={bar} style={{ flex: 1, minWidth: '60px', position: 'relative' }}>
                <div style={{ fontSize: '0.6rem', opacity: 0.3, textAlign: 'center', marginBottom: '8px' }}>{bar}</div>
                
                {['DRUMS', 'BASS', 'MELODY', 'CHORDS'].map(track => {
                  const hasEvents = store.events.some(e => e.track === track && e.bar === bar);
                  return (
                    <div key={track} style={{ height: '40px', border: '1px solid rgba(255,255,255,0.03)', background: hasEvents ? 'rgba(255,255,255,0.02)' : 'transparent', marginBottom: '1rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {store.events.filter(e => e.track === track && e.bar === bar).slice(0, 4).map((_, i) => (
                        <div key={i} style={{ width: '3px', height: '10px', background: 'var(--accent)', margin: '1px', opacity: 0.6 }}></div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="midi-tape-container glass" dir="rtl" style={{ width: '900px', padding: '2rem', borderRadius: '2rem', textAlign: 'right' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className={`status-dot ${store.recordingState !== 'IDLE' ? 'pulse' : ''}`} style={{ width: '12px', height: '12px', borderRadius: '50%', background: store.recordingState !== 'IDLE' ? '#ef4444' : '#22c55e' }}></div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>מנוע אראנג'ר מוזיקלי</h2>
        </div>
        
        <button onClick={() => setUiMode(uiMode === 'BEGINNER' ? 'PRO' : 'BEGINNER')} className="glass-btn">
          {uiMode === 'BEGINNER' ? 'מצב מתקדם' : 'מצב פשוט'}
        </button>
      </header>

      {renderTimeline()}

      {uiMode === 'PRO' && (
        <section className="arranger-pro-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', marginBottom: '2rem' }}>
          <div className="segments-panel glass" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.8rem', opacity: 0.5 }}>מבנה האראנג'ר</h3>
              {store.nextSegment && <span style={{ color: 'var(--accent)', fontSize: '0.7rem' }}>ממתין ל: {store.nextSegment}</span>}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {['INTRO', 'VARIATION A', 'VARIATION B', 'VARIATION C', 'VARIATION D', 'FILL', 'ENDING'].map(seg => (
                <button 
                  key={seg} 
                  onClick={() => store.setNextSegment(seg)}
                  className={`seg-btn ${store.currentSegment === seg ? 'active' : ''}`}
                  style={{ 
                    background: store.currentSegment === seg ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                    color: store.currentSegment === seg ? 'black' : 'white',
                    border: 'none', padding: '12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800
                  }}
                >
                  {seg}
                </button>
              ))}
            </div>
          </div>

          <div className="stats-panel glass" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
             <div className="stat-item">
                <label>BPM</label>
                <input 
                  type="number" 
                  value={store.bpm} 
                  onChange={(e) => store.setBpm(parseInt(e.target.value))} 
                  style={{ fontSize: '2rem', width: '100%', background: 'transparent', border: 'none', color: 'var(--accent)', fontWeight: 900 }}
                />
             </div>
             <div className="stat-item" style={{ marginTop: '1rem' }}>
                <label>אקורד נוכחי</label>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{store.currentChord ? `${store.currentChord.root}${store.currentChord.type}` : '--'}</div>
             </div>
          </div>
        </section>
      )}

      <footer style={{ display: 'flex', justifyContent: 'center', gap: '2rem', alignItems: 'center' }}>
        <button onClick={() => store.clearEvents()} className="round-btn secondary"><RotateCcw size={24} /></button>
        
        <button 
          onClick={handleToggleRecord} 
          className={`record-main ${store.recordingState !== 'IDLE' ? 'recording' : ''}`}
          style={{ 
            width: '100px', height: '100px', borderRadius: '50%', 
            background: store.recordingState !== 'IDLE' ? '#ef4444' : 'rgba(239, 68, 68, 0.1)',
            border: '4px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {store.recordingState !== 'IDLE' ? <Square size={40} fill="white" /> : <Play size={40} fill="#ef4444" style={{ marginLeft: '-4px' }} />}
        </button>

        <button onClick={handleExport} className="round-btn secondary"><Download size={24} /></button>
      </footer>

      <style>{`
        .glass-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 0.5rem 1.5rem; borderRadius: 2rem; cursor: pointer; }
        .round-btn { width: 60px; height: 60px; borderRadius: 50%; border: none; background: rgba(255,255,255,0.05); color: white; display: flex; alignItems: center; justifyContent: center; cursor: pointer; }
        .active { background: var(--accent) !important; color: black !important; }
        .pulse { animation: pulse 1s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default MIDITape;
