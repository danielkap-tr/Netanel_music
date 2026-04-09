import { useStore } from '../store/useStore';
import { MIDIEvent } from './midi_engine';
import { MagentaService } from './magenta_service';

export interface GeneratedTrack {
    type: 'DRUMS' | 'BASS' | 'PIANO' | 'GUITAR' | 'STRINGS' | 'BRASS' | 'PERC' | 'ORGAN' | 'ACCORDION';
    events: MIDIEvent[];
}

export class StyleGenerator {
    /**
     * Orchestrates a full 10-track professional ensemble.
     */
    static async generateStyleAI(sourceEvents: MIDIEvent[], bpm: number, durationBeats: number, variation: 'A' | 'B' | 'C' | 'D' = 'A'): Promise<GeneratedTrack[]> {
        const state = useStore.getState();
        const log = state.addLog;
        const musicalStyle = state.musicalStyle || 'pop';
        
        log(`StyleGenerator: Initializing AI Engine for style "${musicalStyle}"...`, "info");
        
        try {
            // Analyze root
            const root = (sourceEvents.find(e => e.type === 'note')?.data1 || 60) % 12;

            const aiEvents = await MagentaService.generateAccompaniment(sourceEvents, bpm, durationBeats);
            
            // Map the flat events back into GeneratedTrack structure
            const tracks: GeneratedTrack[] = [
                { type: 'DRUMS', events: aiEvents.filter(e => e.track === 'DRUMS') },
                { type: 'BASS', events: aiEvents.filter(e => e.track === 'BASS') },
                { type: 'PIANO', events: this.generatePiano(root, bpm, durationBeats) },
                { type: 'STRINGS', events: this.generateStrings(root, bpm, durationBeats) },
                { type: 'BRASS', events: this.generateBrass(root, bpm, durationBeats) }
            ];

            // Add Style-Specific tracks that AI might miss
            if (musicalStyle === 'freilach' || musicalStyle === 'hora') {
                tracks.push({ type: 'ACCORDION', events: this.generateAccordion(root, bpm, durationBeats) });
            } else {
                tracks.push({ type: 'GUITAR', events: this.generateGuitar(root, bpm, durationBeats) });
            }

            return tracks;
        } catch (error: any) {
            log(`StyleGenerator Error: AI failed, falling back to Classic "${musicalStyle}" mode: ${error.message}`, "error");
            return this.generateStyle(sourceEvents, musicalStyle, bpm, durationBeats, variation);
        }
    }

    /**
     * Classic Rule-Based Generation
     */
    static generateStyle(sourceEvents: MIDIEvent[], musicalStyle: string, bpm: number, durationBeats: number, variation: 'A' | 'B' | 'C' | 'D' = 'A'): GeneratedTrack[] {
        const tracks: GeneratedTrack[] = [];
        const scale = this.analyzeScale(sourceEvents);
        const root = (sourceEvents.find(e => e.type === 'note')?.data1 || 60) % 12;
        
        useStore.getState().addLog(`StyleGenerator: Analyzing style "${musicalStyle}" at ${bpm} BPM`, "info");
        useStore.getState().addLog(`StyleGenerator: Detected root note ${(root + 12) % 12}`, "info");
        
        // 1. Core Rhythm Section
        tracks.push({ type: 'DRUMS', events: this.generateDrums(musicalStyle, bpm, durationBeats, variation) });
        tracks.push({ type: 'PERC', events: this.generatePercussion(musicalStyle, bpm, durationBeats, variation) });
        tracks.push({ type: 'BASS', events: this.generateBass(root, musicalStyle, bpm, durationBeats, variation) });

        // 2. Harmonic Accompaniment
        tracks.push({ type: 'PIANO', events: this.generatePiano(root, bpm, durationBeats) });
        if (musicalStyle === 'freilach') {
            tracks.push({ type: 'ACCORDION', events: this.generateAccordion(root, bpm, durationBeats) });
        } else {
            tracks.push({ type: 'GUITAR', events: this.generateGuitar(root, bpm, durationBeats) });
        }
        tracks.push({ type: 'STRINGS', events: this.generateStrings(root, bpm, durationBeats) });

        // 3. Brass Accents (Groove reinforcement)
        tracks.push({ type: 'BRASS', events: this.generateBrass(root, bpm, durationBeats) });

        useStore.getState().addLog(`StyleGenerator: Professional "${musicalStyle}" (Var ${variation}) generated`, "info");

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

    private static generateDrums(style: string, bpm: number, durationBeats: number, variation: string): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        const bars = Math.ceil(durationBeats / 4);
        
        for (let bar = 0; bar < bars; bar++) {
            const offset = bar * 4;
            
            // Add a fill every 4 bars (if not first bar)
            if (bar > 0 && bar % 4 === 3) {
                events.push(...this.generateFill(style, bpm, offset));
                continue;
            }

            if (style === 'pop-dance' || style === 'pop') {
                // Professional FOUR-ON-THE-FLOOR Polish
                for (let b = 0; b < 4; b++) {
                    const step = offset + b;
                    if (step >= durationBeats) break;
                    const time = step * (60000 / bpm);
                    
                    // 1. Kick (Four on the floor)
                    events.push(this.createDrumEvent(36, 115, time, step));

                    // 2. Snare/Clap Layer on 2 & 4
                    if (b === 1 || b === 3) {
                        events.push(this.createDrumEvent(38, 110, time, step)); // Main Snare
                        if (variation === 'C' || variation === 'D') {
                            events.push(this.createDrumEvent(39, 100, time, step)); // Layered Clap
                        }
                    }

                    // 3. Ghost Notes (Snare Chatter)
                    if (variation !== 'A') {
                        [0.75, 1.75, 2.75, 3.75].forEach(gs => {
                            if (step + gs < durationBeats) {
                                events.push(this.createDrumEvent(38, 25 + Math.random() * 15, (step + gs) * (60000/bpm), step + gs));
                            }
                        });
                    }
                }

                // 4. Hi-Hats (Driving 16ths or 8ths)
                const hatStep = variation === 'A' ? 0.5 : 0.25;
                for (let h = 0; h < 4; h += hatStep) {
                    if (offset + h >= durationBeats) break;
                    const time = (offset + h) * (60000 / bpm);
                    let velocity = 75 + Math.random() * 20;
                    if (h % 1 !== 0) velocity *= 0.7; // Off-beat accent logic
                    if (h % 1 === 0.5) velocity = 105; // Strong Upbeat "Tcha!"
                    
                    events.push(this.createDrumEvent(42, velocity, time, offset + h));
                }
            } else if (style === 'freilach') {
                // High-energy 2/4 Freilach with Jewish Bounce
                for (let b = 0; b < 4; b += 0.5) {
                    const step = offset + b;
                    const time = step * (60000 / bpm);
                    
                    if (b === 0 || b === 0.75 || b === 2 || b === 2.75) {
                        events.push(this.createDrumEvent(36, 120, time, step)); // Syncopated Kick
                    }
                    if (b === 1 || b === 3) {
                        events.push(this.createDrumEvent(38, 115, time, step)); // Strong Snare
                        // Ghost note before next kick
                        events.push(this.createDrumEvent(38, 30, (step + 0.75) * (60000/bpm), step + 0.75));
                    }
                    if (b % 0.5 === 0) {
                        events.push(this.createDrumEvent(42, 85, time, step)); // 8th Hats
                    }
                }
            } else if (style === 'afrobeats') {
                 // Typical Afrobeats "3-3-2" or syncopated feel
                 const kicks = [0, 0.75, 1.5, 2.25, 3];
                 kicks.forEach(k => {
                     if (offset + k < durationBeats) events.push(this.createDrumEvent(36, 110, (offset + k) * (60000/bpm), offset + k));
                 });
                 [1, 3].forEach(s => {
                     if (offset + s < durationBeats) events.push(this.createDrumEvent(38, 100, (offset + s) * (60000/bpm), offset + s));
                 });
            } else {
                // Default Classic
                for (let b = 0; b < 4; b++) {
                    const step = offset + b;
                    if (step >= durationBeats) break;
                    const time = step * (60000 / bpm);
                    if (b === 0 || b === 2) events.push(this.createDrumEvent(36, 110, time, step));
                    if (b === 1 || b === 3) events.push(this.createDrumEvent(38, 105, time, step));
                    events.push(this.createDrumEvent(42, 85, time, step));
                }
            }
            
            // Crashes on Bar 1 & Section boundaries
            if (bar % 8 === 0) {
                events.push(this.createDrumEvent(49, 110, offset * (60000/bpm), offset));
            }
        }
        return events;
    }

    private static generateFill(style: string, bpm: number, offset: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        // Classic "Snare Roll" fill
        for (let i = 0; i < 8; i++) {
            const step = offset + (i * 0.5);
            const velocity = 60 + (i * 8);
            events.push(this.createDrumEvent(38, velocity, step * (60000/bpm), step));
            if (i > 4) events.push(this.createDrumEvent(36, 100, step * (60000/bpm), step)); // Add kick at end
        }
        return events;
    }

    private static generatePercussion(style: string, bpm: number, durationBeats: number, variation: string): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        
        if (style === 'afrobeats') {
            const resolution = 0.25; 
            for (let b = 0; b < durationBeats / resolution; b++) {
                const step = b * resolution;
                const time = step * (60000 / bpm);
                if (Math.random() > 0.6) {
                    const instrument = [44, 45, 46][Math.floor(Math.random() * 3)]; 
                    events.push(this.createDrumEvent(instrument, 70 + Math.random() * 30, time, step));
                }
            }
        } else if (style === 'pop-dance' && variation !== 'A') {
            for (let b = 0; b < durationBeats * 2; b++) {
                const step = b * 0.5;
                const time = step * (60000 / bpm);
                if (step % 4 === 1.5 || step % 4 === 3.5) {
                    events.push(this.createDrumEvent(37, 85, time, step)); // Rimshot layer
                }
                if (step % 1 === 0.5) {
                    events.push(this.createDrumEvent(54, 75, time, step)); // Tambourine
                }
            }
        } else {
            const resolution = 0.5; 
            for (let b = 0; b < durationBeats / resolution; b++) {
                const time = (b * resolution) * (60000 / bpm);
                events.push(this.createDrumEvent(44, 65 + Math.random() * 20, time, b * resolution)); 
            }
        }
        return events;
    }

    private static generateBass(root: number, style: string, bpm: number, durationBeats: number, variation: string): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        for (let b = 0; b < durationBeats * 2; b++) {
            const step = b * 0.5;
            const time = step * (60000 / bpm);
            
            if (style === 'pop-dance' || style === 'pop') {
                const isOffbeat = step % 1 === 0.5;
                if (variation === 'A') {
                    if (step % 1 === 0) events.push(this.createNoteEvent(24 + root, 100, 1, time, step, 0.4));
                } else if (isOffbeat) {
                    events.push(this.createNoteEvent(24 + root, 115, 1, time, step, 0.4)); // Pumping Offbeat
                } else if (step % 2 === 0 && variation === 'D') {
                    events.push(this.createNoteEvent(36 + root, 95, 1, time, step, 0.25)); // Octave accents
                }
            } else if (style === 'freilach' || style === 'hora') {
                if (step % 1 === 0) {
                    const pitch = (step % 2 === 0) ? 24 + root : 24 + root + 7;
                    events.push(this.createNoteEvent(pitch, 105, 1, time, step, 0.2));
                }
            } else {
                if (step % 1 === 0) {
                    events.push(this.createNoteEvent(24 + root + (step % 4 === 0 ? 0 : 7), 90, 1, time, step, 0.25));
                }
            }
        }
        return events;
    }

    private static generatePiano(root: number, bpm: number, durationBeats: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        const beats = [1, 1.5, 3];
        const bars = Math.ceil(durationBeats / 4);
        for (let bar = 0; bar < bars; bar++) {
            beats.forEach(b => {
                if (bar * 4 + b >= durationBeats) return;
                const time = (bar * 4 + b) * (60000 / bpm);
                [0, 4, 7].forEach(o => events.push(this.createNoteEvent(48 + root + o, 80, 2, time, bar * 4 + b, 0.2)));
            });
        }
        return events;
    }

    private static generateGuitar(root: number, bpm: number, durationBeats: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        for (let b = 0; b < durationBeats * 4; b++) {
            const time = (b * 0.25) * (60000 / bpm);
            events.push(this.createNoteEvent(52 + root + (b % 2 === 0 ? 0 : 3), 60 + Math.random() * 20, 3, time, b * 0.25, 0.1));
        }
        return events;
    }

    private static generateStrings(root: number, bpm: number, durationBeats: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
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
        const bars = Math.ceil(durationBeats / 4);
        for (let bar = 1; bar < bars; bar += 2) {
            const beats = [3, 3.5, 3.75]; 
            beats.forEach(b => {
                if (bar * 4 + b >= durationBeats) return;
                const time = (bar * 4 + b) * (60000 / bpm);
                events.push(this.createNoteEvent(72 + root, 110, 5, time, bar * 4 + b, 0.1));
            });
        }
        return events;
    }

    private static generateAccordion(root: number, bpm: number, durationBeats: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        for (let b = 0; b < durationBeats; b++) {
            const time = (b + 0.5) * (60000 / bpm);
            if ((b + 0.5) < durationBeats) {
                [0, 4, 7].forEach(p => {
                    events.push(this.createNoteEvent(60 + root + p, 85, 1, time, b + 0.5, 0.15));
                });
            }
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
            data2: Math.min(127, Math.max(0, e.data2 + (Math.random() * 10 - 5))),
            time: e.time + (Math.random() * 16 - 8),
            //@ts-ignore
            beat: e.beat !== undefined ? e.beat + (Math.random() * 0.02 - 0.01) : undefined
        }));
    }
}
