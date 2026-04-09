import MidiWriter from 'midi-writer-js';
import { MIDIEvent } from './midi_engine';
import { useStore } from '../store/useStore';

export class ExportService {
    /**
     * Exports the style in two formats: Standard MIDI and Keyboard-Specific Style.
     */
    static async exportMultiFormat(events: MIDIEvent[], styleName: string, bpm: number, keyboardModel: string | null, totalDurationBeats?: number) {
        const log = useStore.getState().addLog;
        log(`Export: Starting multi-format export for ${events.length} events`, "info");
        
        // Use provided duration or fallback to events
        const duration = totalDurationBeats || this.calculateTotalBeats(events);
        
        // 1. Export Standard MIDI
        try {
            log(`Export: Building Standard MIDI writer object (Duration: ${duration} beats)...`, "info");
            const writer = this.buildMidiWriter(events, bpm, false, duration);
            
            log("Export: Building binary file buffer...", "info");
            const buffer = writer.buildFile();
            
            log(`Export: Buffer built (${buffer.length} bytes). Creating download link...`, "info");
            this.downloadBlob(buffer, `AI_Professional_Ensemble_${styleName}.mid`, 'audio/midi');
            log("Export: Standard MIDI download triggered", "info");
        } catch (e: any) {
            log(`Export Error (Standard MIDI): ${e.message}`, "error");
            console.error("Export Error (Standard MIDI):", e);
        }

        // 2. Export Keyboard-Specific Format with a small delay to avoid browser blocking
        const extension = this.getExtensionForModel(keyboardModel);
        log(`Export: Preparing ${extension} style file...`, "info");
        setTimeout(() => {
            try {
                log(`Export: Building ${extension} writer object (Duration: ${duration} beats)...`, "info");
                const writer = this.buildMidiWriter(events, bpm, true, duration);
                
                log(`Export: Building ${extension} binary buffer...`, "info");
                const buffer = writer.buildFile();
                
                log(`Export: ${extension} Buffer built (${buffer.length} bytes). Triggering download...`, "info");
                this.downloadBlob(buffer, `AI_Studio_Style_${styleName}${extension}`, 'audio/midi');
                log(`Export: ${extension} style download triggered`, "info");
            } catch (e: any) {
                log(`Export Error (${extension}): ${e.message}`, "error");
                console.error(`Export Error (${extension}):`, e);
            }
        }, 800);
    }

    private static buildMidiWriter(events: MIDIEvent[], bpm: number, addMarkers = false, totalDurationBeats?: number) {
        const log = useStore.getState().addLog;
        
        // Channel Map (Standard MIDI / Arranger Keyboard Logic)
        const channelMap: Record<string, number> = {
            'PIANO': 1,
            'BASS': 2,
            'GUITAR': 3,
            'STRINGS': 4,
            'BRASS': 5,
            'USER': 6,
            'ACCORDION': 7,
            'ORGAN': 8,
            'DRUMS': 10,  // Mandatory for standard MIDI kits (Ch 10 index is 9 or 10 depending on library)
            'PERC': 11
        };

        const tracks: Record<string, any> = {};
        Object.keys(channelMap).forEach(key => {
            tracks[key] = new MidiWriter.Track();
            tracks[key].addTrackName(key);
            if (key === 'PIANO') tracks[key].setTempo(bpm);
            
            const channel = channelMap[key];
            if (key === 'PIANO') tracks[key].addEvent(new MidiWriter.ProgramChangeEvent({instrument: 1, channel}));
            if (key === 'GUITAR') tracks[key].addEvent(new MidiWriter.ProgramChangeEvent({instrument: 25, channel}));
            if (key === 'STRINGS') tracks[key].addEvent(new MidiWriter.ProgramChangeEvent({instrument: 49, channel}));
            if (key === 'BRASS') tracks[key].addEvent(new MidiWriter.ProgramChangeEvent({instrument: 57, channel}));
            if (key === 'BASS') tracks[key].addEvent(new MidiWriter.ProgramChangeEvent({instrument: 33, channel}));
            if (key === 'ORGAN') tracks[key].addEvent(new MidiWriter.ProgramChangeEvent({instrument: 17, channel}));
            if (key === 'ACCORDION') tracks[key].addEvent(new MidiWriter.ProgramChangeEvent({instrument: 22, channel}));
        });

        log(`Export: Initializing ${Object.keys(tracks).length} tracks and mapping channels`, "info");

        if (addMarkers && totalDurationBeats) {
            log("Export: Adding markers for keyboard style", "info");
            const ticksPerBar = 128 * 4;
            tracks['PIANO'].addMarker('SInt 1', 0);
            
            const lastTick = Math.floor(totalDurationBeats * 128);
            if (totalDurationBeats >= 8) {
                tracks['PIANO'].addMarker('SVar A', ticksPerBar);
                tracks['PIANO'].addMarker('SVar B', Math.floor(totalDurationBeats * 64)); 
                tracks['PIANO'].addMarker('SEnd 1', lastTick - ticksPerBar);
            } else {
                tracks['PIANO'].addMarker('SEnd 1', lastTick);
            }
        } else if (totalDurationBeats) {
            const finalTick = Math.floor(totalDurationBeats * 128);
            tracks['PIANO'].addMarker('End', finalTick);
        }

        log(`Export: Mapping ${events.length} events to multi-channel buffer...`, "info");
        let processedCount = 0;
        const MAX_TICKS = 1000000; 

        events.forEach(ev => {
            if (ev.type !== 'note' || ev.beat === undefined) return;
            
            const durationTicks = Math.floor(Math.min(10000, (ev.durationBeat || 0.5) * 128));
            const startTick = Math.floor(ev.beat * 128);
            const velocity = Math.floor(ev.data2 || 80);

            if (isNaN(durationTicks) || isNaN(startTick) || isNaN(velocity) || startTick > MAX_TICKS || startTick < 0) {
                return;
            }

            try {
                const targetTrack = ev.track || 'USER';
                const channel = channelMap[targetTrack] || 1;
                const pitchName = this.midiNoteToName(ev.data1);
                
                const noteEvent = new MidiWriter.NoteEvent({
                    pitch: [pitchName],
                    duration: `T${durationTicks}`,
                    velocity: Math.min(127, Math.max(0, velocity)),
                    startTick: startTick,
                    channel: channel
                });

                if (tracks[targetTrack]) {
                    tracks[targetTrack].addEvent(noteEvent);
                } else {
                    tracks['USER'].addEvent(noteEvent);
                }
                processedCount++;
            } catch (err) {
                // Ignore
            }
        });

        log(`Export: Mapped ${processedCount} events on ${Object.keys(tracks).length} channels.`, "info");
        return new MidiWriter.Writer(Object.values(tracks));
    }

    private static getExtensionForModel(model: string | null): string {
        if (!model) return '.sty';
        if (model.includes('korg')) return '.sty';
        if (model.includes('yamaha')) return '.sty';
        return '.sty';
    }

    private static calculateTotalBeats(events: MIDIEvent[]): number {
        return events.reduce((max, ev) => {
            const end = (ev.beat || 0) + (ev.durationBeat || 0.1);
            return Math.max(max, end);
        }, 4);
    }

    private static downloadBlob(content: Uint8Array | string, filename: string, mimeType: string) {
        const blob = new Blob([content as any], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    private static midiNoteToName(midi: number): string {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midi / 12) - 1;
        return `${notes[midi % 12]}${octave}`;
    }
}
