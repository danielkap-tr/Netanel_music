import { useStore } from '../store/useStore';
import { MIDIEvent } from './midi_engine';
import { MagentaService } from './magenta_service';

export interface GeneratedTrack {
    type: 'DRUMS' | 'BASS' | 'PIANO' | 'GUITAR' | 'STRINGS' | 'BRASS' | 'PERC' | 'ORGAN';
    events: MIDIEvent[];
}

export class StyleGenerator {
    /**
     * Orchestrates a full 10-track professional ensemble.
     */
    static async generateStyleAI(sourceEvents: MIDIEvent[], bpm: number, durationBeats: number): Promise<GeneratedTrack[]> {
        const log = useStore.getState().addLog;
        log("StyleGenerator: Initializing AI Engine...", "info");
        
        try {
            const aiEvents = await MagentaService.generateAccompaniment(sourceEvents, bpm, durationBeats);
            
            // Map the flat events back into GeneratedTrack structure
            const tracks: GeneratedTrack[] = [
                { type: 'DRUMS', events: aiEvents.filter(e => e.track === 'DRUMS') },
                { type: 'BASS', events: aiEvents.filter(e => e.track === 'BASS') },
                { type: 'PIANO', events: this.generatePiano(60 % 12, bpm, durationBeats) }, // Fallback to classic for some tracks
                { type: 'GUITAR', events: this.generateGuitar(60 % 12, bpm, durationBeats) },
                { type: 'STRINGS', events: this.generateStrings(60 % 12, bpm, durationBeats) },
                { type: 'BRASS', events: this.generateBrass(60 % 12, bpm, durationBeats) }
            ];

            return tracks;
        } catch (error: any) {
            log(`StyleGenerator Error: AI failed, falling back to Classic mode: ${error.message}`, "error");
            return this.generateStyle(sourceEvents, 'pop', bpm, durationBeats);
        }
    }

    /**
     * Classic Rule-Based Generation
     */
    static generateStyle(sourceEvents: MIDIEvent[], musicalStyle: string, bpm: number, durationBeats: number): GeneratedTrack[] {
        const tracks: GeneratedTrack[] = [];
        const scale = this.analyzeScale(sourceEvents);
        const root = (sourceEvents.find(e => e.type === 'note')?.data1 || 60) % 12;
        
        useStore.getState().addLog(`StyleGenerator: Analyzing style "${musicalStyle}" at ${bpm} BPM`, "info");
        useStore.getState().addLog(`StyleGenerator: Detected root note ${(root + 12) % 12}`, "info");
        
        // 1. Core Rhythm Section
        tracks.push({ type: 'DRUMS', events: this.generateDrums(musicalStyle, bpm, durationBeats) });
        tracks.push({ type: 'PERC', events: this.generatePercussion(musicalStyle, bpm, durationBeats) });
        tracks.push({ type: 'BASS', events: this.generateBass(root, musicalStyle, bpm, durationBeats) });

        // 2. Harmonic Accompaniment
        tracks.push({ type: 'PIANO', events: this.generatePiano(root, bpm, durationBeats) });
        tracks.push({ type: 'GUITAR', events: this.generateGuitar(root, bpm, durationBeats) });
        tracks.push({ type: 'STRINGS', events: this.generateStrings(root, bpm, durationBeats) });

        // 3. Brass Accents (Groove reinforcement)
        tracks.push({ type: 'BRASS', events: this.generateBrass(root, bpm, durationBeats) });

        useStore.getState().addLog(`StyleGenerator: Created Rhythm and Harmonic sections`, "info");

        // 4. Humanize & Finish
        tracks.forEach(t => {
            t.events = this.humanizeEvents(t.events);
            t.events.forEach(e => e.track = t.type as any);
        });

        return tracks;
    }

    private static analyzeScale(events: MIDIEvent[]): number[] {
        const firstNote = events.find(e => e.type === 'note')?.data1 || 60;
        const root = firstNote % 12;
        return [0, 2, 3, 5, 7, 8, 10].map(n => (n + root) % 12);
    }

    private static generateDrums(style: string, bpm: number, durationBeats: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        const bars = Math.ceil(durationBeats / 4);
        
        for (let bar = 0; bar < bars; bar++) {
            const offset = bar * 4;
            
            if (style === 'afrobeats') {
                // Typical Afrobeats "3-3-2" or syncopated feel
                const kicks = [0, 0.75, 1.5, 2.25, 3];
                kicks.forEach(k => {
                    if (offset + k < durationBeats) events.push(this.createDrumEvent(36, 110, (offset + k) * (60000/bpm), offset + k));
                });
                [1, 3].forEach(s => {
                    if (offset + s < durationBeats) events.push(this.createDrumEvent(38, 100, (offset + s) * (60000/bpm), offset + s));
                });
            } else if (style === 'trap') {
                // Trap: Snare on 3, fast hats
                if (offset + 2 < durationBeats) events.push(this.createDrumEvent(38, 110, (offset + 2) * (60000/bpm), offset + 2)); // Snare on 3
                const kicks = [0, 0.5, 1.25, 2.75];
                kicks.forEach(k => {
                    if (offset + k < durationBeats) events.push(this.createDrumEvent(36, 120, (offset + k) * (60000/bpm), offset + k));
                });
                // Fast hats (16ths)
                for (let h = 0; h < 16; h++) {
                    const step = h * 0.25;
                    if (offset + step < durationBeats) events.push(this.createDrumEvent(42, 70 + Math.random() * 30, (offset + step) * (60000/bpm), offset + step));
                }
            } else {
                // Classic Pop/Rock
                for (let b = 0; b < 4; b++) {
                    if (offset + b >= durationBeats) break;
                    const time = (offset + b) * (60000 / bpm);
                    if (b === 0 || b === 2) events.push(this.createDrumEvent(36, 110, time, offset + b)); // Kick
                    if (b === 1 || b === 3) events.push(this.createDrumEvent(38, 105, time, offset + b)); // Snare
                    events.push(this.createDrumEvent(42, 85, time, offset + b)); // Hihat
                }
            }
        }
        return events;
    }

    private static generatePercussion(style: string, bpm: number, durationBeats: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        
        if (style === 'afrobeats') {
            // Complex percussion for Afrobeats
            const resolution = 0.25; // 16th notes
            for (let b = 0; b < durationBeats / resolution; b++) {
                const step = b * resolution;
                const time = step * (60000 / bpm);
                if (Math.random() > 0.6) {
                    const instrument = [44, 45, 46][Math.floor(Math.random() * 3)]; // Different perc sounds
                    events.push(this.createDrumEvent(instrument, 70 + Math.random() * 30, time, step));
                }
            }
        } else {
            const resolution = 0.5; // 8th notes
            for (let b = 0; b < durationBeats / resolution; b++) {
                const time = (b * resolution) * (60000 / bpm);
                events.push(this.createDrumEvent(44, 60 + Math.random() * 20, time, b * resolution)); // Shaker/Conga
            }
        }
        return events;
    }

    private static generateBass(root: number, style: string, bpm: number, durationBeats: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        for (let b = 0; b < durationBeats; b++) {
            if (b % 2 === 0) {
                const time = b * (60000 / bpm);
                events.push(this.createNoteEvent(24 + root + (b % 4 === 0 ? 0 : 7), 90, 1, time, b, 0.25));
            }
        }
        return events;
    }

    private static generatePiano(root: number, bpm: number, durationBeats: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        // Piano Stabs on 2, 2+, 4
        const beats = [1, 1.5, 3];
        const bars = Math.ceil(durationBeats / 4);
        for (let bar = 0; bar < bars; bar++) {
            beats.forEach(b => {
                if (bar * 4 + b >= durationBeats) return;
                const time = (bar * 4 + b) * (60000 / bpm);
                // Three note chord
                [0, 4, 7].forEach(o => events.push(this.createNoteEvent(48 + root + o, 80, 2, time, bar * 4 + b, 0.2)));
            });
        }
        return events;
    }

    private static generateGuitar(root: number, bpm: number, durationBeats: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        // Strumming 16ths
        for (let b = 0; b < durationBeats * 4; b++) {
            const time = (b * 0.25) * (60000 / bpm);
            events.push(this.createNoteEvent(52 + root + (b % 2 === 0 ? 0 : 3), 60 + Math.random() * 20, 3, time, b * 0.25, 0.1));
        }
        return events;
    }

    private static generateStrings(root: number, bpm: number, durationBeats: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        // Sustained Root and 5th
        const bars = Math.ceil(durationBeats / 4);
        for (let bar = 0; bar < bars; bar++) {
            if (bar * 4 >= durationBeats) break;
            const time = (bar * 4) * (60000 / bpm);
            events.push(this.createNoteEvent(60 + root, 60, 4, time, bar * 4, 4));
            events.push(this.createNoteEvent(67 + root, 55, 4, time, bar * 4, 4));
        }
        return events;
    }

    private static generateBrass(root: number, bpm: number, durationBeats: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        // Trumpet accents on end of phrase (Bar 2 and 4)
        const bars = Math.ceil(durationBeats / 4);
        for (let bar = 1; bar < bars; bar += 2) {
            const beats = [3, 3.5, 3.75]; // "Pap-pa-pa!"
            beats.forEach(b => {
                if (bar * 4 + b >= durationBeats) return;
                const time = (bar * 4 + b) * (60000 / bpm);
                events.push(this.createNoteEvent(72 + root, 110, 5, time, bar * 4 + b, 0.1));
            });
        }
        return events;
    }

    private static createNoteEvent(note: number, vel: number, ch: number, time: number, beat: number, dur: number): MIDIEvent {
        return { status: 0x90 | ch, data1: note, data2: vel, channel: ch, time, type: 'note', source: 'midi', beat, durationBeat: dur };
    }

    private static createDrumEvent(note: number, vel: number, time: number, beat: number): MIDIEvent {
        return { status: 0x99, data1: note, data2: vel, channel: 9, time, type: 'note', source: 'midi', isDrum: true, beat, durationBeat: 0.1, track: 'DRUMS' };
    }

    private static humanizeEvents(events: MIDIEvent[]): MIDIEvent[] {
        return events.map(e => ({
            ...e,
            data2: Math.min(127, Math.max(0, e.data2 + (Math.random() * 12 - 6))),
            time: e.time + (Math.random() * 24 - 12),
            //@ts-ignore
            beat: e.beat !== undefined ? e.beat + (Math.random() * 0.03 - 0.015) : undefined
        }));
    }
}
