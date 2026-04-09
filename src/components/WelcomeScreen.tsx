import React, { useRef } from 'react';
import { useStore } from '../store/useStore';
import { Sparkles, Settings, Mic, Upload, Music, ArrowLeft, ArrowRight } from 'lucide-react';

const WelcomeScreen: React.FC = () => {
  const { setAppMode, setView, setInputSource, setIsAnalyzing, loadEvents } = useStore();
  const midiInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleStart = (mode: 'BEGINNER' | 'ADVANCED', source: 'RECORD' | 'UPLOAD' | 'AUDIO') => {
    setAppMode(mode);
    setInputSource(source);

    if (source === 'RECORD') {
      setView('WIZARD');
    } else if (source === 'UPLOAD') {
      midiInputRef.current?.click();
    } else if (source === 'AUDIO') {
      audioInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'MIDI' | 'AUDIO') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Transition to Wizard (Setting style/keyboard first)
    setView('WIZARD');

    // Simulate Background Analysis
    setIsAnalyzing(true);
    
    // For the demo/WOW factor: We load some "example" events after a delay
    setTimeout(() => {
        const mockEvents = [
            { status: 0x90, data1: 60, data2: 100, channel: 0, time: 0, beat: 0, durationBeat: 0.5, type: 'note', segment: 'var_a', source: 'midi' },
            { status: 0x90, data1: 64, data2: 100, channel: 0, time: 500, beat: 1, durationBeat: 0.5, type: 'note', segment: 'var_a', source: 'midi' },
            { status: 0x90, data1: 67, data2: 100, channel: 0, time: 1000, beat: 2, durationBeat: 0.5, type: 'note', segment: 'var_a', source: 'midi' },
            { status: 0x90, data1: 72, data2: 100, channel: 0, time: 1500, beat: 3, durationBeat: 0.5, type: 'note', segment: 'var_a', source: 'midi' }
        ];
        loadEvents(mockEvents);
        setIsAnalyzing(false);
    }, 2500);
  };

  return (
    <div className="flex-center animate-fade-in" dir="rtl" style={{ minHeight: '100vh', padding: '2rem' }}>
      <div className="glass-card" style={{ maxWidth: '1000px', width: '100%', padding: '3.5rem', position: 'relative', overflow: 'hidden' }}>
        
        {/* Hidden Inputs */}
        <input type="file" ref={midiInputRef} style={{ display: 'none' }} accept=".mid,.midi" onChange={(e) => handleFileChange(e, 'MIDI')} />
        <input type="file" ref={audioInputRef} style={{ display: 'none' }} accept=".mp3,.wav,.ogg" onChange={(e) => handleFileChange(e, 'AUDIO')} />

        {/* Background Accent */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '400px', height: '400px', background: 'var(--accent-blue)', opacity: 0.05, filter: 'blur(100px)', borderRadius: '50%' }}></div>

        <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 className="text-gradient" style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-1px' }}>
            יוצר המקצבים החכם
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
            הפוך את המוזיקה שלך למקצב מקצועי לאורגן תוך דקות. בחר את מצב העבודה והתחל ליצור.
          </p>
        </header>

        <div className="grid-cols-wizard">
          {/* Beginner Card */}
          <div className="glass-card card-hover" style={{ padding: '2rem', border: '1px solid rgba(59, 130, 246, 0.2)', cursor: 'pointer', transition: '0.3s' }}>
            <div style={{ marginBottom: '1.5rem', color: 'var(--accent-blue)' }}>
              <Sparkles size={48} />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>מצב מתחיל</h3>
            <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
              תהליך אוטומטי מלא. פשוט הקלט או העלה קובץ, והמערכת תייצר עבורך מקצב מוכן.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => handleStart('BEGINNER', 'RECORD')} className="premium-button">
                <Mic size={18} /> התחל הקלטה
              </button>
              <button onClick={() => handleStart('BEGINNER', 'UPLOAD')} className="premium-button secondary">
                <Upload size={18} /> טען קובץ MIDI
              </button>
            </div>
          </div>

          {/* Advanced Card */}
          <div className="glass-card card-hover" style={{ padding: '2rem', border: '1px solid rgba(212, 175, 55, 0.2)', cursor: 'pointer', transition: '0.3s' }}>
            <div style={{ marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>
              <Settings size={48} />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>מצב מתקדם</h3>
            <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
              שליטה מלאה על כל תו. עריכת ציר זמן, ניהול ידני של חלקי המקצב ועיבוד עדין.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => handleStart('ADVANCED', 'RECORD')} className="premium-button" style={{ background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)' }}>
                <Music size={18} /> כניסה לאולפן
              </button>
              <button onClick={() => handleStart('ADVANCED', 'AUDIO')} className="premium-button secondary">
                <Music size={18} /> המרת אודיו (MP3/WAV)
              </button>
            </div>
          </div>
        </div>

        <footer style={{ marginTop: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          תמיכה מלאה ב-KORG, YAMAHA, ROLAND ועוד. <br/>
          פותח עבור Netanel Music - הסאונד שלך, בגרסה חכמה.
        </footer>
      </div>

      <style>{`
        .card-hover:hover {
          transform: translateY(-8px);
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.2) !important;
        }
      `}</style>
    </div>
  );
};

export default WelcomeScreen;
