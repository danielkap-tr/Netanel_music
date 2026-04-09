import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { ChevronRight, ChevronLeft, Check, Keyboard, Music, Info } from 'lucide-react';

const MODELS = [
  { id: 'korg-pa', name: 'KORG PA Series', desc: 'PA700, PA1000, PA4X/5X' },
  { id: 'yamaha-genos', name: 'Yamaha Genos/Tyros', desc: 'Genos, Tyros 5, PSR-S' },
  { id: 'ketron-event', name: 'Ketron Event/SD', desc: 'Event, SD9, SD60' },
  { id: 'generic-midi', name: 'Generic MIDI', desc: 'Standard MIDI Style' }
];

const STYLES = [
  { id: 'mizrachi', name: 'מזרחי (Mizrachi)', desc: 'מקצבי חפלה, דאנס ובלדות' },
  { id: 'afrobeats', name: 'אפרוביט (Afrobeats)', desc: 'גרוב אפריקאי מודרני (Cymatics Inspired)' },
  { id: 'trap', name: 'טראפ (Trap)', desc: 'היי-האטים מהירים ובס עוצמתי (Cymatics Inspired)' },
  { id: 'pop-dance', name: 'פופ ודאנס (Pop)', desc: 'מקצבים מודרניים לרחבה' },
  { id: 'funk-soul', name: 'פאנק וסול (Funk)', desc: 'גרוב חי ועשיר' },
  { id: 'rock-ballad', name: 'רוק ובלדות (Rock)', desc: 'תופים עוצמתיים וגיטרות' }
];

const ConfigWizard: React.FC = () => {
  const { setView, setKeyboardModel, setMusicalStyle, keyboardModel, musicalStyle } = useStore();
  const [step, setStep] = useState(1);

  const handleNext = () => {
    if (step < 2) setStep(step + 1);
    else setView('WORKBENCH');
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else setView('WELCOME');
  };

  return (
    <div className="flex-center animate-fade-in" dir="rtl" style={{ minHeight: '100vh', padding: '2rem' }}>
      <div className="glass-card" style={{ maxWidth: '800px', width: '100%', padding: '3rem' }}>
        
        {/* Progress Stepper */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '15px', left: '0', right: '0', height: '2px', background: 'var(--border-light)', zIndex: 0 }}></div>
          {[1, 2].map(s => (
            <div key={s} style={{ 
              width: '32px', height: '32px', borderRadius: '50%', background: step >= s ? 'var(--accent-blue)' : 'var(--bg-main)', 
              border: '2px solid', borderColor: step >= s ? 'var(--accent-blue)' : 'var(--border-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, transition: '0.3s'
            }}>
              {step > s ? <Check size={16} /> : s}
            </div>
          ))}
        </div>

        {step === 1 ? (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>בחר את האורגן שלך</h2>
            <p style={{ color: 'var(--text-dim)', marginBottom: '2rem' }}>התאמת המבנה הפנימי של המקצב למפרט היצרן.</p>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              {MODELS.map(m => (
                <div key={m.id} 
                     onClick={() => setKeyboardModel(m.id)}
                     className={`glass-card selection-item ${keyboardModel === m.id ? 'active' : ''}`}
                     style={{ padding: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1.5rem', transition: '0.2s' }}>
                  <div className="icon-box"><Keyboard size={24} /></div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{m.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{m.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>בחירת סגנון מוזיקלי</h2>
            <p style={{ color: 'var(--text-dim)', marginBottom: '2rem' }}>הסגנון משפיע על ניתוח ההרמוניה ותבניות הליווי האוטומטיות.</p>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              {STYLES.map(s => (
                <div key={s.id} 
                     onClick={() => setMusicalStyle(s.id)}
                     className={`glass-card selection-item ${musicalStyle === s.id ? 'active' : ''}`}
                     style={{ padding: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1.5rem', transition: '0.2s' }}>
                  <div className="icon-box"><Music size={24} /></div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
          <button onClick={handleBack} className="premium-button secondary">
            <ChevronRight size={20} /> חזרה
          </button>
          <button 
            onClick={handleNext} 
            disabled={step === 1 ? !keyboardModel : !musicalStyle}
            className="premium-button"
            style={{ opacity: (step === 1 ? !keyboardModel : !musicalStyle) ? 0.5 : 1 }}
          >
            {step === 2 ? 'התחל ליצור' : 'המשך'} <ChevronLeft size={20} />
          </button>
        </div>
      </div>

      <style>{`
        .selection-item:hover { border-color: rgba(59, 130, 246, 0.4); background: rgba(59, 130, 246, 0.05); }
        .selection-item.active { border-color: var(--accent-blue); background: rgba(59, 130, 246, 0.1); box-shadow: var(--glow-blue); }
        .icon-box { background: var(--bg-main); padding: 12px; border-radius: 12px; color: var(--text-muted); }
        .active .icon-box { color: var(--accent-blue); }
      `}</style>
    </div>
  );
};

export default ConfigWizard;
