import * as Tone from 'tone';
import { useStore } from '../store/useStore';
import { MIDIEvent } from './midi_engine';

class PlaybackEngine {
    private synths: Record<string, any> = {};
    private currentPart: Tone.Part | null = null;
    private isInitialized = false;
    private masterReverb: Tone.Reverb | null = null;
    private masterLimiter: Tone.Limiter | null = null;
    private masterChorus: Tone.Chorus | null = null;

    private async initSynths() {
        if (this.isInitialized) return;

        // Master FX Chain
        this.masterReverb = new Tone.Reverb({ decay: 2.5, wet: 0.3 }).toDestination();
        this.masterLimiter = new Tone.Limiter(-1).toDestination();
        this.masterChorus = new Tone.Chorus(4, 2.5, 0.5).connect(this.masterReverb);
        
        await this.masterReverb.generate();

        // 1. Drums (808 Samples with slight room)
        this.synths['DRUMS'] = new Tone.Sampler({
            urls: { 
                C1: "https://tonejs.github.io/audio/drum-samples/808/kick.mp3",
                D1: "https://tonejs.github.io/audio/drum-samples/808/snare.mp3",
                "F#1": "https://tonejs.github.io/audio/drum-samples/808/hihat.mp3"
            }
        }).connect(this.masterLimiter);
        this.synths['DRUMS'].volume.value = -4;

        // 1.5. Professional Percussion (Cymatics Local Samples)
        this.synths['PERC'] = new Tone.Sampler({
            urls: {
                C2: "/samples/perc/bongo.wav",
                D2: "/samples/perc/shaker.wav",
                E2: "/samples/perc/tamb.wav",
                F2: "/samples/perc/cowbell.wav"
            }
        }).connect(this.masterReverb);
        this.synths['PERC'].volume.value = -8;

        // 2. Bass (Deep, Warm DuoSynth)
        this.synths['BASS'] = new Tone.DuoSynth({
            vibratoAmount: 0.1,
            vibratoRate: 5,
            harmonicity: 1.5,
            voice0: {
                oscillator: { type: "triangle" },
                envelope: { attack: 0.05, release: 0.5 },
                filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.5, baseFrequency: 200, octaves: 2.5 }
            },
            voice1: {
                oscillator: { type: "sine" },
                envelope: { attack: 0.1, release: 0.5 }
            }
        }).connect(this.masterLimiter);
        this.synths['BASS'].volume.value = -12;

        // 3. Piano / Accomp (Rich FM)
        this.synths['PIANO'] = new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: 1,
            modulationIndex: 3.5,
            oscillator: { type: "triangle" },
            envelope: { attack: 0.01, decay: 0.5, sustain: 0.4, release: 1 },
            modulation: { type: "square" },
            modulationEnvelope: { attack: 0.1, decay: 0.2, sustain: 0.3, release: 1 }
        }).connect(this.masterReverb);
        this.synths['PIANO'].volume.value = -16;

        // 4. Strings / Pad (Dreamy & Wide)
        this.synths['STRINGS'] = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sine" },
            envelope: { attack: 1.2, decay: 2, sustain: 0.8, release: 2.5 }
        }).connect(this.masterChorus);
        this.synths['STRINGS'].volume.value = -20;

        // 5. Brass (Bright & Dynamic)
        this.synths['BRASS'] = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sawtooth" },
            envelope: { attack: 0.08, decay: 0.3, sustain: 0.6, release: 0.2 }
        }).connect(this.masterReverb);
        this.synths['BRASS'].volume.value = -16;

        // 5.5. Accordion (New - For Freilach)
        this.synths['ACCORDION'] = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "square" },
            envelope: { attack: 0.15, decay: 0.1, sustain: 0.8, release: 0.3 }
        }).connect(this.masterChorus);
        this.synths['ACCORDION'].volume.value = -14;

        // 6. User (Standard Solo Piano)
        this.synths['USER'] = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "triangle" },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 1 }
        }).connect(this.masterReverb);
        this.synths['USER'].volume.value = -10;

        this.isInitialized = true;
    }

    async playArrangement() {
        const state = useStore.getState();
        const { events, bpm } = state;

        await Tone.start();
        this.initSynths();
        this.stop();

        Tone.Transport.bpm.value = bpm;

        const toneEvents = events
            .filter(e => e.type === 'note' && e.beat !== undefined)
            .map(ev => ({
                time: ev.beat || 0,
                note: this.midiNoteToTone(ev.data1),
                velocity: ev.data2 / 127,
                duration: ev.durationBeat ? ev.durationBeat * (60 / bpm) : 0.5,
                track: ev.track || 'USER'
            }));

        this.currentPart = new Tone.Part((time, value) => {
            const synth = this.synths[value.track] || this.synths['USER'];
            
            if (value.track === 'DRUMS') {
                let drumKey = 'C1';
                if (value.note.startsWith('D')) drumKey = 'D1';
                if (value.note.startsWith('F#') || value.note.startsWith('G')) drumKey = 'F#1';
                (synth as any).triggerAttackRelease(drumKey, value.duration, time, value.velocity || 0.8);
            } else if (value.track === 'PERC') {
                // Round-robin or mapping-based PERC
                const percKeys = ['C2', 'D2', 'E2', 'F2'];
                const key = percKeys[Math.floor(Math.random() * percKeys.length)];
                (synth as any).triggerAttackRelease(key, value.duration, time, value.velocity || 0.6);
            } else {
                (synth as any).triggerAttackRelease(value.note, value.duration, time, value.velocity || 0.7);
            }
        }, toneEvents);

        this.currentPart.loop = false; // As requested, no loop
        this.currentPart.start(0);
        Tone.Transport.start();
        state.setPlaybackState('PLAYING');

        // End of playback listener
        const lastBeat = Math.max(...toneEvents.map(e => e.time + 1));
        Tone.Transport.scheduleOnce(() => {
            this.stop();
        }, lastBeat);
    }

    stop() {
        this.currentPart?.stop();
        this.currentPart?.dispose();
        this.currentPart = null;
        Tone.Transport.stop();
        Tone.Transport.cancel();
        Object.values(this.synths).forEach(s => (s as any).releaseAll?.());
        useStore.getState().setPlaybackState('IDLE');
    }

    getCurrentBeat(): number {
        if (Tone.Transport.state !== 'started') return 0;
        return Tone.Transport.seconds * (Tone.Transport.bpm.value / 60);
    }

    private midiNoteToTone(midi: number): string {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midi / 12) - 1;
        return `${notes[midi % 12]}${octave}`;
    }
}

export const playbackEngine = new PlaybackEngine();
