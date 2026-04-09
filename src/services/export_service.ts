import MidiWriter from 'midi-writer-js';
import { MIDIEvent } from './midi_engine';

export class ExportService {
    /**
     * Exports the style in two formats: Standard MIDI and Keyboard-Specific Style.
     */
    static async exportMultiFormat(events: MIDIEvent[], styleName: string, bpm: number, keyboardModel: string | null) {
        // 1. Export Standard MIDI
        this.exportMidi(events, styleName, bpm);

        // 2. Export Keyboard-Specific Format with a small delay to avoid browser blocking
        const extension = this.getExtensionForModel(keyboardModel);
        setTimeout(() => {
            this.exportKeyboardStyle(events, styleName, bpm, extension);
        }, 800);
    }

    private static exportMidi(events: MIDIEvent[], styleName: string, bpm: number) {
        const writer = this.buildMidiWriter(events, bpm);
        this.downloadFile(writer.dataUri(), `AI_Professional_Ensemble_${styleName}.mid`);
    }

    private static exportKeyboardStyle(events: MIDIEvent[], styleName: string, bpm: number, extension: string) {
        const writer = this.buildMidiWriter(events, bpm, true);
        this.downloadFile(writer.dataUri(), `AI_Studio_Style_${styleName}${extension}`);
    }

    private static buildMidiWriter(events: MIDIEvent[], bpm: number, addMarkers = false) {
        const tracks: Record<string, any> = {
            'USER': new MidiWriter.Track(),
            'DRUMS': new MidiWriter.Track(),
            'PERC': new MidiWriter.Track(),
            'BASS': new MidiWriter.Track(),
            'PIANO': new MidiWriter.Track(),
            'GUITAR': new MidiWriter.Track(),
            'STRINGS': new MidiWriter.Track(),
            'BRASS': new MidiWriter.Track()
        };

        // Initialize Tracks with Metadata and Program Changes
        Object.keys(tracks).forEach(key => {
            const t = tracks[key];
            t.addTrackName(key);
            if (key === 'USER') t.setTempo(bpm);
            
            // Standard General MIDI Program Changes
            if (key === 'PIANO') t.addEvent(new MidiWriter.ProgramChangeEvent({instrument: 1}));
            if (key === 'GUITAR') t.addEvent(new MidiWriter.ProgramChangeEvent({instrument: 25}));
            if (key === 'STRINGS') t.addEvent(new MidiWriter.ProgramChangeEvent({instrument: 49}));
            if (key === 'BRASS') t.addEvent(new MidiWriter.ProgramChangeEvent({instrument: 57}));
            if (key === 'BASS') t.addEvent(new MidiWriter.ProgramChangeEvent({instrument: 33}));
        });

        if (addMarkers) {
            tracks['USER'].addMarker('SInt 1', 0);
            tracks['USER'].addMarker('SVar A', 128 * 4);
            tracks['USER'].addMarker('SVar B', 128 * 8);
            tracks['USER'].addMarker('SEnd 1', 128 * 12);
        }

        events.forEach(ev => {
            if (ev.type !== 'note' || ev.beat === undefined) return;
            
            const noteEvent = new MidiWriter.NoteEvent({
                pitch: [this.midiNoteToName(ev.data1)],
                duration: `T${Math.floor((ev.durationBeat || 0.5) * 128)}`,
                velocity: Math.floor(ev.data2),
                startTick: Math.floor(ev.beat * 128)
            });

            const targetTrack = ev.track || 'USER';
            if (tracks[targetTrack]) {
                tracks[targetTrack].addEvent(noteEvent);
            } else {
                tracks['USER'].addEvent(noteEvent);
            }
        });

        return new MidiWriter.Writer(Object.values(tracks));
    }

    private static getExtensionForModel(model: string | null): string {
        if (!model) return '.sty';
        if (model.includes('korg')) return '.sty';
        if (model.includes('yamaha')) return '.sty';
        return '.sty';
    }

    private static downloadFile(uri: string, filename: string) {
        const link = document.createElement('a');
        link.href = uri;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    private static midiNoteToName(midi: number): string {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midi / 12) - 1;
        return `${notes[midi % 12]}${octave}`;
    }
}
