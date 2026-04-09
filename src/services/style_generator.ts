import { MIDIEvent } from './midi_engine';

export interface GeneratedTrack {
    type: 'DRUMS' | 'BASS' | 'PIANO' | 'GUITAR' | 'STRINGS' | 'BRASS' | 'PERC' | 'ORGAN';
    events: MIDIEvent[];
}

export class StyleGenerator {
    /**
     * Orchestrates a full 10-track professional ensemble.
     */
    static generateStyle(sourceEvents: MIDIEvent[], musicalStyle: string, bpm: number): GeneratedTrack[] {
        const tracks: GeneratedTrack[] = [];
        const scale = this.analyzeScale(sourceEvents);
        const root = (sourceEvents.find(e => e.type === 'note')?.data1 || 60) % 12;
        
        // 1. Core Rhythm Section
        tracks.push({ type: 'DRUMS', events: this.generateDrums(musicalStyle, bpm) });
        tracks.push({ type: 'PERC', events: this.generatePercussion(musicalStyle, bpm) });
        tracks.push({ type: 'BASS', events: this.generateBass(root, musicalStyle, bpm) });

        // 2. Harmonic Accompaniment
        tracks.push({ type: 'PIANO', events: this.generatePiano(root, bpm) });
        tracks.push({ type: 'GUITAR', events: this.generateGuitar(root, bpm) });
        tracks.push({ type: 'STRINGS', events: this.generateStrings(root, bpm) });

        // 3. Brass Accents (Groove reinforcement)
        tracks.push({ type: 'BRASS', events: this.generateBrass(root, bpm) });

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

    private static generateDrums(style: string, bpm: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        for (let bar = 0; bar < 4; bar++) {
            const offset = bar * 4;
            for (let b = 0; b < 4; b++) {
                const time = (offset + b) * (60000 / bpm);
                if (b === 0 || b === 2) events.push(this.createDrumEvent(36, 110, time, offset + b)); // Kick
                if (b === 1 || b === 3) events.push(this.createDrumEvent(38, 105, time, offset + b)); // Snare
                events.push(this.createDrumEvent(42, 85, time, offset + b)); // Hihat
            }
        }
        return events;
    }

    private static generatePercussion(style: string, bpm: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        for (let b = 0; b < 16; b++) {
            const time = (b * 0.5) * (60000 / bpm);
            events.push(this.createDrumEvent(44, 60 + Math.random() * 20, time, b * 0.5)); // Shaker/Conga
        }
        return events;
    }

    private static generateBass(root: number, style: string, bpm: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        for (let b = 0; b < 16; b++) {
            if (b % 2 === 0) {
                const time = b * (60000 / bpm);
                events.push(this.createNoteEvent(24 + root + (b % 4 === 0 ? 0 : 7), 90, 1, time, b, 0.25));
            }
        }
        return events;
    }

    private static generatePiano(root: number, bpm: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        // Piano Stabs on 2, 2+, 4
        const beats = [1, 1.5, 3];
        for (let bar = 0; bar < 4; bar++) {
            beats.forEach(b => {
                const time = (bar * 4 + b) * (60000 / bpm);
                // Three note chord
                [0, 4, 7].forEach(o => events.push(this.createNoteEvent(48 + root + o, 80, 2, time, bar * 4 + b, 0.2)));
            });
        }
        return events;
    }

    private static generateGuitar(root: number, bpm: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        // Strumming 16ths
        for (let b = 0; b < 32; b++) {
            const time = (b * 0.25) * (60000 / bpm);
            events.push(this.createNoteEvent(52 + root + (b % 2 === 0 ? 0 : 3), 60 + Math.random() * 20, 3, time, b * 0.25, 0.1));
        }
        return events;
    }

    private static generateStrings(root: number, bpm: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        // Sustained Root and 5th
        for (let bar = 0; bar < 4; bar++) {
            const time = (bar * 4) * (60000 / bpm);
            events.push(this.createNoteEvent(60 + root, 60, 4, time, bar * 4, 4));
            events.push(this.createNoteEvent(67 + root, 55, 4, time, bar * 4, 4));
        }
        return events;
    }

    private static generateBrass(root: number, bpm: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        // Trumpet accents on end of phrase (Bar 2 and 4)
        for (let bar = 1; bar < 4; bar += 2) {
            const beats = [3, 3.5, 3.75]; // "Pap-pa-pa!"
            beats.forEach(b => {
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
