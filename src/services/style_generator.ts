import { useStore } from '../store/useStore';
import { MIDIEvent } from './midi_engine';
import { MagentaService } from './magenta_service';

export interface GeneratedTrack {
    type: 'DRUMS' | 'BASS' | 'PIANO' | 'GUITAR' | 'STRINGS' | 'BRASS' | 'PERC' | 'ORGAN' | 'ACCORDION';
    events: MIDIEvent[];
}

interface BlockAnalysis {
    root: number;
    energy: number; // 0 to 1
    variation: 'A' | 'B' | 'C' | 'D';
}

export class StyleGenerator {
    /**
     * The Intelligent Arranger - Processes the song section by section.
     */
    static async generateStyleAI(sourceEvents: MIDIEvent[], bpm: number, durationBeats: number, baselineVariation: 'A' | 'B' | 'C' | 'D' = 'B'): Promise<GeneratedTrack[]> {
        const state = useStore.getState();
        const log = state.addLog;
        const style = state.musicalStyle || 'pop-dance';
        
        try {
            log(`Ultimate Arranger: Analyzing ${durationBeats} beats of performance...`, "info");
            
            const blocks = this.analyzeBlocks(sourceEvents, durationBeats);
            log(`Ultimate Arranger: Detected ${blocks.length} sections. Orchestrating...`, "info");

            const tracks: Record<string, MIDIEvent[]> = {
                'DRUMS': [], 'BASS': [], 'PIANO': [], 'STRINGS': [], 'BRASS': [], 'GUITAR': [], 'PERC': [], 'ACCORDION': []
            };

            for (let i = 0; i < blocks.length; i++) {
                const block = blocks[i];
                const startBeat = i * 4;
                const duration = Math.min(4, durationBeats - startBeat);
                if (duration <= 0) break;

                // 1. Core Rhythm
                tracks['DRUMS'].push(...this.generateDrums(style, bpm, duration, block.variation, startBeat));
                if (duration === 4 && i < blocks.length - 1) {
                   tracks['DRUMS'].push(...this.generateFill(style, bpm, startBeat + 3));
                }

                // 2. Core Harmony
                tracks['BASS'].push(...this.generateBass(block.root, style, bpm, duration, block.variation, startBeat));
                tracks['PIANO'].push(...this.generatePiano(block.root, bpm, duration, style, startBeat, block.energy));
                tracks['STRINGS'].push(...this.generateStrings(block.root, bpm, duration, startBeat, block.energy));
                
                // 3. Orchestration & Highlights
                if (style === 'freilach' || style === 'hora') {
                    tracks['ACCORDION'].push(...this.generateAccordion(block.root, bpm, duration, startBeat));
                } else {
                    tracks['GUITAR'].push(...this.generateGuitar(block.root, bpm, duration, startBeat));
                }

                // Professional Brass Section (No more "Cemetery" note)
                if (block.energy > 0.4 || style === 'freilach') {
                    tracks['BRASS'].push(...this.generateBrass(block.root, bpm, duration, startBeat, block.energy));
                    tracks['PERC'].push(...this.generatePercussion(style, bpm, duration, block.variation, startBeat));
                }
            }

            // 4. Final Processing
            const result: GeneratedTrack[] = Object.keys(tracks).map(key => ({
                type: key as any,
                events: this.processEvents(tracks[key], bpm, 0.54, key) 
            }));

            log("Ultimate Arranger: Professional Orchestration Successful.", "info");
            return result;

        } catch (error: any) {
            log(`Arranger Error: ${error.message}`, "error");
            return this.generateStyle(sourceEvents, style, bpm, durationBeats);
        }
    }

    private static analyzeBlocks(events: MIDIEvent[], totalBeats: number): BlockAnalysis[] {
        const numBlocks = Math.ceil(totalBeats / 4);
        const blocks: BlockAnalysis[] = [];

        for (let i = 0; i < numBlocks; i++) {
            const start = i * 4;
            const end = start + 4;
            const blockEvents = events.filter(e => e.type === 'note' && (e.beat || 0) >= start && (e.beat || 0) < end && e.source !== 'ai');

            const noteCount = blockEvents.length;
            const avgVel = blockEvents.length > 0 
                ? blockEvents.reduce((sum, e) => sum + (e.data2 || 80), 0) / blockEvents.length 
                : 0;
            const energy = Math.min(1, (noteCount * (avgVel / 127)) / 16); 

            let root = 0;
            if (blockEvents.length > 0) {
                const stableNotes = blockEvents.filter(e => (e.durationBeat || 0) > 0.05);
                const trackingNotes = stableNotes.length > 0 ? stableNotes : blockEvents;
                const lowNotes = trackingNotes.map(e => e.data1).sort((a,b) => a - b);
                root = lowNotes[0] % 12;
            } else if (blocks.length > 0) {
                root = blocks[blocks.length - 1].root; 
            }

            let variation: 'A' | 'B' | 'C' | 'D' = 'B';
            if (energy < 0.2) variation = 'A';
            else if (energy < 0.5) variation = 'B';
            else if (energy < 0.8) variation = 'C';
            else variation = 'D';

            blocks.push({ root, energy, variation });
        }
        return blocks;
    }

    static generateStyle(sourceEvents: MIDIEvent[], style: string, bpm: number, durationBeats: number): GeneratedTrack[] {
        const root = this.analyzeBlocks(sourceEvents, durationBeats)[0]?.root || 0;
        const tracks: Record<string, MIDIEvent[]> = {
            'DRUMS': this.generateDrums(style, bpm, durationBeats, 'B', 0),
            'BASS': this.generateBass(root, style, bpm, durationBeats, 'B', 0),
            'PIANO': this.generatePiano(root, bpm, durationBeats, style, 0, 0.5)
        };
        return Object.keys(tracks).map(k => ({
            type: k as any,
            events: this.processEvents(tracks[k], bpm, 0.54, k)
        }));
    }

    private static generateDrums(style: string, bpm: number, duration: number, variation: string, offsetBeat: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        for (let sub = 0; sub < duration * 4; sub++) {
            const beatInBlock = sub * 0.25;
            const step = offsetBeat + beatInBlock;
            const time = step * (60000/bpm);
            const isOnBeat = beatInBlock % 1 === 0;
            const isOffBeat = beatInBlock % 1 === 0.5;
            const isBackbeat = beatInBlock === 1 || beatInBlock === 3;
            
            if (style === 'pop-dance' || style === 'pop') {
                if (isOnBeat) events.push(this.createDrumEvent(36, 120, time, step));
                if (isBackbeat) {
                    events.push(this.createDrumEvent(38, 118, time, step));
                    if (variation === 'C' || variation === 'D') events.push(this.createDrumEvent(39, 90, time, step));
                }
                if (isOffBeat && variation !== 'A') events.push(this.createDrumEvent(46, 105, time, step));
                let hatVel = isOnBeat ? 95 : (isOffBeat ? 85 : 60);
                events.push(this.createDrumEvent(42, hatVel, time, step));
            } else if (style === 'freilach') {
                if (isOnBeat) events.push(this.createDrumEvent(36, 120, time, step));
                if (isBackbeat) events.push(this.createDrumEvent(38, 115, time, step));
                if (beatInBlock % 0.5 === 0) events.push(this.createDrumEvent(42, 95, time, step));
            } else {
                if (isOnBeat) events.push(this.createDrumEvent(36, 110, time, step));
                if (isBackbeat) events.push(this.createDrumEvent(38, 105, time, step));
                events.push(this.createDrumEvent(42, 85, time, step));
            }
        }
        return events;
    }

    private static generateFill(style: string, bpm: number, offsetBeat: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        for (let i = 0; i < 4; i++) {
            const step = offsetBeat + (i * 0.25);
            events.push(this.createDrumEvent(38, 90 + (i*10), step*(60000/bpm), step));
            if (i === 3) events.push(this.createDrumEvent(49, 125, step*(60000/bpm), step));
        }
        return events;
    }

    private static generateBass(root: number, style: string, bpm: number, duration: number, variation: string, offsetBeat: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        for (let b = 0; b < duration * 2; b++) {
            const step = offsetBeat + (b * 0.5);
            const isOnBeat = step % 1 === 0;
            if (style === 'pop-dance' || style === 'pop') {
                let velocity = isOnBeat ? 70 : 120;
                if (variation === 'A' && !isOnBeat) continue;
                events.push(this.createNoteEvent(24 + root, velocity, 1, step*(60000/bpm), step, 0.4, 'BASS'));
            } else if (style === 'freilach') {
                if (isOnBeat) {
                    const pitch = (step % 2 === 0) ? 24 + root : 24 + root + 7;
                    events.push(this.createNoteEvent(pitch, 115, 1, step*(60000/bpm), step, 0.2, 'BASS'));
                }
            } else {
                if (isOnBeat) events.push(this.createNoteEvent(24 + root, 100, 1, step*(60000/bpm), step, 0.4, 'BASS'));
            }
        }
        return events;
    }

    private static generatePiano(root: number, bpm: number, duration: number, style: string, offsetBeat: number, energy: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        // Rich Chords: 1-3-5-7 or 1-5-8
        const chord = energy > 0.6 ? [0, 3, 7, 10] : [0, 7, 12];
        const pianoBeats = style === 'pop-dance' ? [0.5, 1.5, 2.75] : [0, 1, 2, 3];
        
        pianoBeats.forEach(b => {
             if (b < duration) {
                 const step = offsetBeat + b;
                 chord.forEach(p => events.push(this.createNoteEvent(48+root+p, 80 + (energy*20), 2, step*(60000/bpm), step, 0.2, 'PIANO')));
             }
        });
        return events;
    }

    private static generateStrings(root: number, bpm: number, duration: number, offsetBeat: number, energy: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        // Longitudinal Pad
        const velocity = 45 + (energy * 30);
        // Root and Fifth for depth
        [0, 7].forEach(p => {
            events.push(this.createNoteEvent(60+root+p, velocity, 4, offsetBeat*(60000/bpm), offsetBeat, duration - 0.1, 'STRINGS'));
        });
        return events;
    }

    private static generateBrass(root: number, bpm: number, duration: number, offsetBeat: number, energy: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        // Rhythmic Section Stabs (Fixes "Cemetery" note)
        const stabs = [0, 0.75, 2.0, 3.75];
        const velocity = 85 + (energy * 30);
        
        stabs.forEach(b => {
            if (b < duration) {
                const step = offsetBeat + b;
                // Full Horn Section (Root + Major 3rd + Octave)
                [0, 4, 12].forEach(p => {
                    events.push(this.createNoteEvent(60+root+p, velocity, 5, step*(60000/bpm), step, 0.15, 'BRASS'));
                });
            }
        });
        return events;
    }

    private static generatePercussion(style: string, bpm: number, duration: number, variation: string, offsetBeat: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        for (let b = 0; b < duration * 4; b++) {
            const step = offsetBeat + (b * 0.25);
            events.push(this.createDrumEvent(44, 45 + (b%2===0?25:10), step*(60000/bpm), step));
        }
        return events;
    }

    private static generateGuitar(root: number, bpm: number, duration: number, offsetBeat: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        for (let b = 0; b < duration; b++) {
            if (b % 1 === 0.75) events.push(this.createNoteEvent(52+root, 70, 3, (offsetBeat+b)*(60000/bpm), offsetBeat+b, 0.1, 'GUITAR'));
        }
        return events;
    }

    private static generateAccordion(root: number, bpm: number, duration: number, offsetBeat: number): MIDIEvent[] {
        const events: MIDIEvent[] = [];
        for (let b = 0; b < duration; b++) {
            const step = offsetBeat + b + 0.5;
            events.push(this.createNoteEvent(60+root, 80, 1, step*(60000/bpm), step, 0.2, 'ACCORDION'));
        }
        return events;
    }

    private static createNoteEvent(note: number, vel: number, ch: number, time: number, beat: number, dur: number, track: string = 'USER'): MIDIEvent {
        return { 
            status: 0x90 | ch, data1: note, data2: vel, channel: ch, time, type: 'note', 
            source: 'ai', beat, durationBeat: dur, track: track as any 
        };
    }

    private static createDrumEvent(note: number, vel: number, time: number, beat: number): MIDIEvent {
        return { 
            status: 0x99, data1: note, data2: vel, channel: 9, time, type: 'note', 
            source: 'ai', isDrum: true, beat, durationBeat: 0.1, track: 'DRUMS' 
        };
    }

    private static processEvents(events: MIDIEvent[], bpm: number, swingAmount: number, trackName: string): MIDIEvent[] {
        if (!events) return [];
        return events.map(e => {
            let processedBeat = e.beat || 0;
            const floor = Math.floor(processedBeat * 2) / 2;
            const frac = processedBeat - floor;
            if (frac > 0.1 && frac < 0.4) processedBeat = floor + 0.25 + (swingAmount - 0.5) * 0.12;
            else if (frac > 0.6 && frac < 0.9) processedBeat = floor + 0.75 + (swingAmount - 0.5) * 0.12;

            const humanizedBeat = processedBeat + (Math.random() * 0.006 - 0.003);
            const humanizedVel = Math.min(127, Math.max(0, (e.data2 || 80) + (Math.random() * 10 - 5)));
            const humanizedTime = humanizedBeat * (60000 / bpm);

            return { ...e, beat: humanizedBeat, data2: humanizedVel, time: humanizedTime, source: 'ai', track: trackName as any };
        });
    }
}
