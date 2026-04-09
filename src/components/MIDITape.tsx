import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RotateCcw, Activity, Music, Keyboard, Play, Square, Settings, Sparkles, Download, ArrowRight, Save, Check } from 'lucide-react';
import { midiEngine } from '../services/midi_engine';
import { useStore } from '../store/useStore';
import { midiNoteToName } from '../utils/midi_utils';
import { playbackEngine } from '../services/playback_engine';
import { StyleGenerator } from '../services/style_generator';
import { ExportService } from '../services/export_service';

const MIDITape: React.FC = () => {
  const store = useStore();
  const [midiStatus, setMidiStatus] = useState<string>("מאתחל...");
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const { isAnalyzing, events, bpm, musicalStyle, keyboardModel, appMode, recordingState, recordingStartTime, setBpm, setView, clearRecording, switchSegment, activeSegmentId, segmentStats, lastNote, activeNotes } = store;
  
  const timelineRef = useRef<HTMLDivElement>(null);

  // 1. Keyboard Simulation
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
      if (noteMap[key]) midiEngine.simulateMessage(0x90, noteMap[key], 100);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const noteMap: Record<string, number> = {
        'a': 60, 'w': 61, 's': 62, 'e': 63, 'd': 64, 'f': 65, 't': 66, 'g': 67, 'y': 68, 'h': 70, 'j': 71, 'k': 72
      };
      if (noteMap[key]) midiEngine.simulateMessage(0x80, noteMap[key], 0);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [store]);

  // 2. MIDI & Audio Init
  useEffect(() => {
    midiEngine.setStatusHandler((status) => setMidiStatus(status));
    midiEngine.init().then(() => {
      midiEngine.setEventHandler((event) => {
        const state = useStore.getState();
        if (event.type === 'note') state.updateActiveNote(event.data1, event.data2);
        state.addEvent(event);
      });
    });
  }, []);

  // 3. Timers (Recording & Playback)
  useEffect(() => {
    let interval: any;
    if (store.recordingState === 'RECORDING' || store.playbackState === 'PLAYING') {
      interval = setInterval(() => {
        if (store.recordingState === 'RECORDING' && store.recordingStartTime) {
          const elapsedMs = performance.now() - store.recordingStartTime;
          const elapsedBeats = (elapsedMs / 1000) * (store.bpm / 60);
          setCurrentTime(elapsedMs / 1000);
          setCurrentBeat(elapsedBeats);
        } else if (store.playbackState === 'PLAYING') {
          // Sync with Tone.Transport
          const beats = playbackEngine.getCurrentBeat();
          setCurrentBeat(beats);
        }

        if (timelineRef.current) {
          const playheadX = currentBeat * 80;
          const containerWidth = timelineRef.current.clientWidth;
          if (playheadX > containerWidth / 2) {
             timelineRef.current.scrollLeft = playheadX - containerWidth / 2;
          }
        }
      }, 20);
    } else {
      setCurrentTime(0);
      setCurrentBeat(0);
    }
    return () => clearInterval(interval);
  }, [store.recordingState, store.playbackState, store.recordingStartTime, store.bpm, currentBeat]);

  const handleGenerate = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      try {
        if (!store.events || store.events.length === 0) {
            throw new Error("No events to process");
        }

        // 1. Professional AI Pattern Generation
        const tracks = StyleGenerator.generateStyle(store.events, store.musicalStyle || 'pop', store.bpm);
        const generatedEvents = tracks.flatMap(t => t.events);
        store.loadEvents(generatedEvents, true);

        // 2. Multi-Format Professional Export
        ExportService.exportMultiFormat(
            [...store.events, ...generatedEvents], 
            store.musicalStyle || 'AI_Style', 
            store.bpm, 
            store.keyboardModel
        );

        alert("עיבוד AI הושלם! 2 קבצים הורדו: MIDI מקצועי ופורמט מקצב ייעודי.");
      } catch (error) {
        console.error("AI Generation Error:", error);
        alert("אירעה שגיאה בעיבוד המקצב. וודא שהקלטת משהו ונסה שוב.");
      } finally {
        setIsGenerating(false);
      }
    }, 3000);
  };

  const barLines = useMemo(() => {
    const lines = [];
    const maxBars = Math.ceil(Math.max(currentBeat / 4 + 1, 32));
    for (let i = 0; i < maxBars; i++) lines.push(i * 4);
    return lines;
  }, [currentBeat]);

  return (
    <>
      {store.appMode === 'BEGINNER' && store.recordingState !== 'RECORDING' && store.events.length > 0 ? (
          <div className="flex-center animate-fade-in" dir="rtl" style={{ height: '100vh', padding: '2rem' }}>
              <div className="glass-card" style={{ maxWidth: '600px', width: '100%', padding: '3rem', textAlign: 'center' }}>
                  <div style={{ color: 'var(--accent-green)', marginBottom: '1.5rem' }}><CheckIcon size={64}/></div>
                  <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>ההקלטה הושלמה!</h2>
                  <p style={{ color: 'var(--text-dim)', marginBottom: '2.5rem' }}>
                      קלטנו {store.events.length} תווים. המערכת מוכנה לייצר את המקצב המלא עבור ה-{store.keyboardModel}.
                  </p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={handleGenerate} className="premium-button" style={{ flex: 1, justifyContent: 'center', padding: '1.5rem' }}>
                            {isGenerating ? 'מעבד נתונים...' : <><Sparkles size={20}/> צור מקצב עכשיו</>}
                        </button>
                        <button onClick={() => store.playbackState === 'PLAYING' ? playbackEngine.stop() : playbackEngine.playArrangement()} 
                                className={`premium-button ${store.playbackState === 'PLAYING' ? 'active' : ''}`} style={{ flex: 1, justifyContent: 'center' }}>
                            {store.playbackState === 'PLAYING' ? <><Square size={20}/> עצור האזנה</> : <><Play size={20}/> האזן לתוצאה</>}
                        </button>
                    </div>
                    <button onClick={() => store.clearRecording()} className="premium-button secondary" style={{ justifyContent: 'center' }}>
                        <RotateCcw size={18}/> הקלט מחדש
                    </button>
              </div>
          </div>
      ) : (
        <div className="animate-fade-in" dir="rtl" style={{ 
          display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1400px', margin: '0 auto', padding: '1.5rem', height: '100vh', overflow: 'hidden'
        }}>
          
          <header className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem', padding: '1rem 2rem', alignItems: 'center' }}>
              <HUDItem label="מצב עבודה" value={store.appMode === 'ADVANCED' ? 'מקצועי' : 'פשוט'} color="var(--accent-gold)" icon={<Settings size={14}/>} />
              <HUDItem label="BPM" value={<input type="number" value={store.bpm} onChange={(e) => store.setBpm(parseInt(e.target.value))} className="bpm-input"/>} />
              <HUDItem label="תיבה | פעימה" value={`${Math.floor(currentBeat / 4) + 1} | ${Math.floor(currentBeat % 4) + 1}`} color="var(--accent-blue)" />
              <HUDItem label="דגם אורגן" value={store.keyboardModel?.toUpperCase() || 'KORG'} />
              <HUDItem label="חיבור MIDI" value={midiStatus} color={midiStatus.includes('Connected') ? 'var(--accent-green)' : 'var(--text-muted)'} />
          </header>

          <section className="glass-card" ref={timelineRef} style={{ direction: 'ltr', overflowX: 'auto', position: 'relative', height: '240px', background: 'rgba(0,0,0,0.3)' }}>
              <div style={{ width: `${Math.max(currentBeat * 80 + 2000, 2000)}px`, height: '100%', position: 'relative' }}>
                 {barLines.map(beatIdx => (
                    <div key={beatIdx} style={{ position: 'absolute', height: '100%', width: '1px', background: 'rgba(255,255,255,0.05)', left: beatIdx * 80 }}>
                        <span style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{Math.floor(beatIdx / 4) + 1}</span>
                    </div>
                 ))}
                 {store.events.map((ev, idx) => {
                   if (ev.type !== 'note' || ev.beat === undefined || ev.durationBeat === undefined) return null;
                   const left = ev.beat * 80;
                   const width = Math.max(12, ev.durationBeat * 80 - 2);
                   const top = Math.max(20, Math.min(180, (127 - ev.data1) * 1.4 + 40));
                   const isActive = store.playbackState === 'PLAYING' && currentBeat >= ev.beat && currentBeat <= ev.beat + (ev.durationBeat || 0);

                   return (
                     <div key={idx} className={`note-block ${isActive ? 'active-note' : ''}`} style={{ 
                        left, width, top, opacity: ev.opacity || 0.8,
                        background: ev.track === 'DRUMS' ? '#ef4444' : 
                                    ev.track === 'PERC' ? '#f97316' :
                                    ev.track === 'BASS' ? '#d4af37' : 
                                    ev.track === 'PIANO' ? '#3b82f6' :
                                    ev.track === 'GUITAR' ? '#8b4513' :
                                    ev.track === 'STRINGS' ? '#a855f7' :
                                    ev.track === 'BRASS' ? '#22c55e' : '#06b6d4',
                        boxShadow: `0 0 ${isActive ? '25px' : '15px'} ${ev.track === 'DRUMS' ? '#ef4444' : 
                                             ev.track === 'PERC' ? '#f97316' :
                                             ev.track === 'BASS' ? '#d4af37' : 
                                             ev.track === 'PIANO' ? '#3b82f6' :
                                             ev.track === 'GUITAR' ? '#8b4513' :
                                             ev.track === 'STRINGS' ? '#a855f7' :
                                             ev.track === 'BRASS' ? '#22c55e' : '#06b6d4'}${isActive ? 'ff' : '44'}`
                     }}></div>
                   );
                 })}
                 <div style={{ position: 'absolute', top: 0, bottom: 0, width: '2px', background: 'var(--accent-gold)', left: currentBeat * 80, zIndex: 10, boxShadow: '0 0 15px var(--accent-gold)' }}></div>
              </div>
          </section>

          <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
              <div className="glass-card" style={{ width: '300px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>מפת מקצב (ARRANGER)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <MatrixSection label="Variations" items={['var_a', 'var_b', 'var_c', 'var_d']} icons={['A','B','C','D']} />
                    <MatrixSection label="Fills" items={['fill_a', 'fill_b', 'fill_c', 'fill_d']} icons={['F1','F2','F3','F4']} />
                    <MatrixSection label="Intro / Ending" items={['intro_1', 'ending_1']} icons={['IN','OUT']} />
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="glass-card flex-center" style={{ flex: 1, background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.05) 0%, transparent 70%)' }}>
                     <div style={{ textAlign: 'center' }}>
                        <div style={{ marginBottom: '2rem' }}>
                            <button onClick={() => store.setRecordingState(store.recordingState === 'RECORDING' ? 'IDLE' : 'RECORDING')} 
                                    className={`rec-button-large ${store.recordingState === 'RECORDING' ? 'active' : ''}`}>
                                <div className="inner-circle"></div>
                            </button>
                            <p style={{ marginTop: '1rem', fontWeight: 700, color: store.recordingState === 'RECORDING' ? 'var(--accent-red)' : 'var(--text-dim)' }}>
                                {store.recordingState === 'RECORDING' ? 'הקלטה פעילה' : 'לחץ להקלטה'}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={handleGenerate} className="premium-button">
                                <Sparkles size={18}/> צור מקצב
                            </button>
                            <button onClick={() => store.playbackState === 'PLAYING' ? playbackEngine.stop() : playbackEngine.playArrangement()} 
                                    className={`premium-button ${store.playbackState === 'PLAYING' ? 'active' : ''}`}>
                                {store.playbackState === 'PLAYING' ? <><Square size={18}/> עצור</> : <><Play size={18}/> האזן</>}
                            </button>
                            <button className="premium-button secondary">
                                <Download size={18}/> ייצוא
                            </button>
                        </div>
                     </div>
                  </div>

                  <footer className="glass-card" style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>סגנון: <b>{store.musicalStyle || 'כללי'}</b></span>
                          <div className="active-glow"></div>
                      </div>
                      <button onClick={() => store.setView('WELCOME')} className="icon-text-btn"><ArrowRight size={14}/> חזרה לתפריט</button>
                  </footer>
              </div>
          </div>
        </div>
      )}

      {(isAnalyzing || isGenerating) && (
          <div className="flex-center" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)', zIndex: 9999 }}>
              <div style={{ textAlign: 'center', maxWidth: '500px', width: '90%' }}>
                  <div className="analysis-spinner"></div>
                  <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginTop: '2.5rem' }} className="text-gradient">
                    {isGenerating ? 'עיבוד AI מתקדם...' : 'מנתח קלט מוזיקלי...'}
                  </h2>
                  <p style={{ color: 'var(--text-dim)', marginTop: '0.8rem', fontSize: '1.1rem' }}>
                    {isGenerating ? 'מחשב תבניות ליווי, האנשה וייצוא פורמטים...' : 'מזהה סולם, קצב ומבנה הרמוני באמצעות בינה מלאכותית'}
                  </p>
                  
                  {isGenerating && (
                      <div style={{ marginTop: '2rem', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                          <div className="progress-bar-fill"></div>
                      </div>
                  )}
              </div>
          </div>
      )}

      <style>{`
        .progress-bar-fill {
            height: 100%; width: 0; background: linear-gradient(90deg, var(--accent-blue), var(--accent-gold));
            animation: progress-slide 3s linear forwards;
        }
        @keyframes progress-slide { to { width: 100%; } }
        .analysis-spinner {
            width: 80px; height: 80px; border: 4px solid var(--border-light); border-top-color: var(--accent-blue);
            border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;
            box-shadow: 0 0 20px var(--accent-blue);
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .hud-unit { border-left: 1px solid var(--border-light); padding-right: 1.5rem; }
        .bpm-input { background: none; border: none; color: var(--accent-blue); font-size: 1.2rem; font-weight: 900; width: 60px; outline: none; }
        .note-block { position: absolute; height: 14px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); }
        .rec-button-large { width: 80px; height: 80px; border-radius: 50%; background: var(--bg-main); border: 2px solid var(--border-light); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.3s; }
        .rec-button-large:hover { border-color: var(--accent-red); transform: scale(1.05); }
        .rec-button-large .inner-circle { width: 30px; height: 30px; background: var(--accent-red); border-radius: 50%; transition: 0.3s; }
        .rec-button-large.active { border-color: var(--accent-red); box-shadow: 0 0 20px rgba(239, 68, 68, 0.3); }
        .rec-button-large.active .inner-circle { border-radius: 6px; transform: scale(0.8); animation: pulse-rec 1s infinite; }
        @keyframes pulse-rec { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        .matrix-btn-sm { width: 100%; padding: 0.8rem; border-radius: 10px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-light); display: flex; align-items: center; gap: 12px; color: var(--text-dim); transition: 0.2s; cursor: pointer; }
        .matrix-btn-sm:hover { background: rgba(255,255,255,0.05); border-color: var(--text-muted); }
        .matrix-btn-sm.active { border-color: var(--accent-blue); color: white; background: rgba(59, 130, 246, 0.1); }
        .matrix-icon { width: 28px; height: 28px; border-radius: 6px; background: var(--bg-deep); display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 800; border: 1px solid var(--border-light); }
        .active-glow { width: 8px; height: 8px; background: var(--accent-green); border-radius: 50%; box-shadow: 0 0 10px var(--accent-green); }
        .icon-text-btn { background: none; border: none; color: var(--text-muted); display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem; }
        .icon-text-btn:hover { color: white; }
        .active-note { filter: brightness(1.5) contrast(1.2); border-color: white !important; z-index: 5; }
        @keyframes note-glow {
            from { opacity: 0.8; }
            to { opacity: 1; filter: brightness(2); }
        }
      `}</style>
    </>
  );
};

const HUDItem = ({ label, value, color, icon }: any) => (
  <div className="hud-unit">
    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {icon} {label}
    </div>
    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: color || 'white' }}>{value}</div>
  </div>
);

const MatrixSection = ({ label, items, icons }: any) => {
    const store = useStore();
    return (
        <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '8px' }}>{label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {items.map((it: string, i: number) => (
                    <button key={it} 
                            onClick={() => store.recordingState === 'RECORDING' ? store.switchSegment(it) : playbackEngine.playArrangement()}
                            className={`matrix-btn-sm ${store.activeSegmentId === it ? 'active' : ''}`}>
                        <div className="matrix-icon">{icons[i]}</div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{translateSegment(it)}</span>
                        {store.segmentStats[it]?.eventCount > 0 && <span style={{ marginRight: 'auto', fontSize: '0.6rem', color: 'var(--accent-blue)' }}>●</span>}
                    </button>
                ))}
            </div>
        </div>
    );
};

const CheckIcon = ({ size }: { size: number }) => (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--accent-green)' }}>
        <Check size={size/2} />
    </div>
);

const translateSegment = (id: string) => {
    const map: any = { 'var_a': 'וריאציה א', 'var_b': 'וריאציה ב', 'var_c': 'וריאציה ג', 'var_d': 'וריאציה ד', 'fill_a': 'מעבר 1', 'fill_b': 'מעבר 2', 'fill_c': 'מעבר 3', 'fill_d': 'מעבר 4', 'intro_1': 'פתיחה', 'ending_1': 'סיום' };
    return map[id] || id;
};

export default MIDITape;
