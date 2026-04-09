import * as Tone from 'tone';
import { useStore } from '../store/useStore';
import { MIDIEvent } from './midi_engine';

class PlaybackEngine {
    private synths: Record<string, any> = {};
    private currentPart: Tone.Part | null = null;
    private isInitialized = false;

    private initSynths() {
        if (this.isInitialized) return;

        // 1. Drums (Simplified GM-like)
        this.synths['DRUMS'] = new Tone.Sampler({
            urls: { 
                C1: "https://tonejs.github.io/audio/drum-samples/CR8000/kick.mp3",
                D1: "https://tonejs.github.io/audio/drum-samples/CR8000/snare.mp3",
                "F#1": "https://tonejs.github.io/audio/drum-samples/CR8000/hihat.mp3"
            }
        }).toDestination();
        this.synths['DRUMS'].volume.value = -6;

        // 2. Bass (Deep)
        this.synths['BASS'] = new Tone.MonoSynth({
            oscillator: { type: "sawtooth" },
            envelope: { attack: 0.1, release: 0.5 }
        }).toDestination();
        this.synths['BASS'].volume.value = -15;

        // 3. Piano / Accomp
        this.synths['PIANO'] = new Tone.PolySynth(Tone.Synth).toDestination();
        this.synths['PIANO'].volume.value = -18;

        // 4. Strings / Pad
        this.synths['STRINGS'] = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sine" },
            envelope: { attack: 1.5, release: 1.5 }
        }).toDestination();
        this.synths['STRINGS'].volume.value = -22;

        // 5. Brass
        this.synths['BRASS'] = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sawtooth" },
            envelope: { attack: 0.05, decay: 0.2, sustain: 1, release: 0.1 }
        }).toDestination();
        this.synths['BRASS'].volume.value = -18;

        // 6. User (Default)
        this.synths['USER'] = new Tone.PolySynth(Tone.Synth).toDestination();
        this.synths['USER'].volume.value = -12;

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
            
            if (value.track === 'DRUMS' || value.track === 'PERC') {
                // Map MIDI drum notes to sampler keys
                let drumKey = 'C1';
                if (value.note.startsWith('D')) drumKey = 'D1';
                if (value.note.startsWith('F#') || value.note.startsWith('G')) drumKey = 'F#1';
                (synth as any).triggerAttackRelease(drumKey, value.duration, time, value.velocity);
            } else {
                (synth as any).triggerAttackRelease(value.note, value.duration, time, value.velocity);
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
