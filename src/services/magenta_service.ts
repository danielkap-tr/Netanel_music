import * as mm from '@magenta/music';
import { MIDIEvent } from './midi_engine';
import { useStore } from '../store/useStore';

/**
 * Service to handle AI music generation using Magenta.js
 * Credits: Google Magenta Team
 */
export class MagentaService {
    private static drumRnn = new mm.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/drum_kit_rnn');
    private static melodyRnn = new mm.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn');
    private static initialized = false;

    static async init() {
        if (this.initialized) return;
        const log = useStore.getState().addLog;
        try {
            log("AI: Loading Magenta models (TensorFlow.js)...", "info");
            await Promise.all([
                this.drumRnn.initialize(),
                this.melodyRnn.initialize()
            ]);
            this.initialized = true;
            log("AI: Models loaded and ready", "info");
        } catch (error: any) {
            log(`AI Error: Failed to load models: ${error.message}`, "error");
        }
    }

    /**
     * Parses a MIDI file Blob into an array of MIDIEvents
     */
    static async blobToEvents(blob: Blob, bpm: number): Promise<{ events: MIDIEvent[], durationBeats: number }> {
        const log = useStore.getState().addLog;
        log(`AI: Parsing MIDI file (${(blob.size / 1024).toFixed(1)} KB)...`, "info");
        
        try {
            const seq = await mm.blobToNoteSequence(blob);
            const events = this.noteSequenceToEvents(seq, bpm, 'USER');
            
            const durationBeats = seq.totalTime ? (seq.totalTime * (bpm / 60)) : 0;
            log(`AI: Parsed ${events.length} events over ${durationBeats.toFixed(1)} beats.`, "info");
            
            return { events, durationBeats };
        } catch (error: any) {
            log(`AI Error: Failed to parse MIDI file: ${error.message}`, "error");
            throw error;
        }
    }

    /**
     * Generates a complete 10-track style accompaniment based on source events
     */
    static async generateAccompaniment(sourceEvents: MIDIEvent[], bpm: number, durationBeats: number): Promise<MIDIEvent[]> {
        await this.init();
        const log = useStore.getState().addLog;
        
        log("AI: Transforming MIDI to NoteSequence...", "info");
        let inputSeq = this.midiToNoteSequence(sourceEvents, bpm);
        
        // IMPORTANT: RNN models require a quantized sequence
        log("AI: Quantizing sequence (4 steps per quarter)...", "info");
        inputSeq = mm.sequences.quantizeNoteSequence(inputSeq, 4);
        
        // 1. Generate Drums (AI Pattern) - Generate a 2-bar loop and then repeat it
        log("AI: Generating rhythmic patterns (DrumsRNN)...", "info");
        const drumSeq = await this.drumRnn.continueSequence(inputSeq, 32, 1.0); // 32 steps = 2 bars
        
        // 2. Generate Bass/Lead (AI Continuation) - Generate a 2-bar loop and then repeat it
        log("AI: Generating melodic accompaniment (MelodyRNN)...", "info");
        const melodySeq = await this.melodyRnn.continueSequence(inputSeq, 32, 1.1);
        
        // 3. Convert back to MIDI events and LOOP them to fill the duration
        const rawDrumEvents = this.noteSequenceToEvents(drumSeq, bpm, 'DRUMS');
        const rawMelodyEvents = this.noteSequenceToEvents(melodySeq, bpm, 'BASS');
        
        const drumEvents = this.loopEvents(rawDrumEvents, 8, durationBeats); // Raw is 8 beats (2 bars)
        const melodyEvents = this.loopEvents(rawMelodyEvents, 8, durationBeats);
        
        log(`AI: Generated ${drumEvents.length + melodyEvents.length} new musical events`, "info");
        return [...drumEvents, ...melodyEvents];
    }

    private static midiToNoteSequence(events: MIDIEvent[], bpm: number): mm.INoteSequence {
        const notes = events
            .filter(e => e.type === 'note' && e.beat !== undefined)
            .map(e => ({
                pitch: e.data1,
                startTime: (e.beat || 0) * (60 / bpm),
                endTime: ((e.beat || 0) + (e.durationBeat || 0.25)) * (60 / bpm),
                velocity: e.data2
            }));

        return {
            notes,
            totalTime: notes.reduce((max, n) => Math.max(max, n.endTime), 0),
            tempos: [{ qpm: bpm }]
        };
    }

    private static noteSequenceToEvents(seq: mm.INoteSequence, bpm: number, track: string): MIDIEvent[] {
        if (!seq.notes) return [];
        return seq.notes.map(n => ({
            status: track === 'DRUMS' ? 0x99 : 0x90, // MIDI Status
            data1: n.pitch || 60,
            data2: n.velocity || 80,
            channel: track === 'DRUMS' ? 9 : 0,
            time: (n.startTime || 0) * 1000,
            type: 'note',
            source: 'midi',
            beat: (n.startTime || 0) * (bpm / 60),
            durationBeat: ((n.endTime || 0.25) - (n.startTime || 0)) * (bpm / 60),
            track: track as any
        }));
    }

    private static loopEvents(events: MIDIEvent[], sourceLengthBeats: number, targetLengthBeats: number): MIDIEvent[] {
        const looped: MIDIEvent[] = [];
        const iterations = Math.ceil(targetLengthBeats / sourceLengthBeats);
        
        for (let i = 0; i < iterations; i++) {
            events.forEach(e => {
                const newBeat = (e.beat || 0) + (i * sourceLengthBeats);
                if (newBeat >= targetLengthBeats) return;
                
                looped.push({
                    ...e,
                    beat: newBeat,
                    time: e.time + (i * sourceLengthBeats * 1000 * 60 / (e.time > 0 ? (e.beat || 1) * 1000 * 60 / e.time : 120)) // Heuristic time sync
                });
            });
        }
        return looped;
    }
}
