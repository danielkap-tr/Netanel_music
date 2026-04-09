import * as Tone from 'tone';
import { useStore } from '../store/useStore';

class PlaybackEngine {
  private synth: Tone.PolySynth | null = null;
  private currentPart: Tone.Part | null = null;

  private initSynth() {
    if (!this.synth) {
      this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
      this.synth.volume.value = -12;
    }
  }

  async playSegment(segmentId: string) {
    const state = useStore.getState();
    const { events, bpm, segmentStats } = state;
    const stats = segmentStats[segmentId];
    
    // Filter only notes for this segment (only Note On events that were paired)
    const segmentEvents = events.filter(e => e.segment === segmentId && e.type === 'note' && e.durationBeat !== undefined);
    
    console.log(`Playback: Found ${segmentEvents.length} notes for segment ${segmentId}. Total events: ${events.length}`);
    
    if (segmentEvents.length === 0) {
        console.warn(`No notes found for segment: ${segmentId}`);
        return;
    }

    await Tone.start();
    this.initSynth();
    this.stop();

    // Set Transport BPM
    Tone.Transport.bpm.value = bpm;

    // Prepare events for Tone.Part
    // We use 'beat' for scheduling to be BPM-independent
    const toneEvents = segmentEvents.map(ev => ({
      time: ev.beat || 0,
      note: this.midiNoteToTone(ev.data1),
      velocity: ev.data2 / 127,
      duration: ev.durationBeat ? `${ev.durationBeat}n` : '8n'
    }));

    this.currentPart = new Tone.Part((time, value) => {
      this.synth?.triggerAttackRelease(value.note, value.duration, time, value.velocity);
    }, toneEvents);

    // Looping Logic
    if (stats.loop) {
        this.currentPart.loop = true;
        // Calculating loop end based on bars (assuming 4 beats per bar)
        const maxBeat = Math.max(...toneEvents.map(e => e.time + (segmentEvents.find(se => se.beat === e.time)?.durationBeat || 0)));
        const loopBars = Math.ceil(maxBeat / 4);
        this.currentPart.loopEnd = `${loopBars}m`;
    } else {
        this.currentPart.loop = false;
        // Non-looping (Intros, Fills, Endings)
        // If it's a Fill, we could transit back to a Variation here if we had a sequencer,
        // but for now we just play once as requested.
    }

    this.currentPart.start(0);
    Tone.Transport.start();
    state.setPlaybackState('PLAYING');
  }

  stop() {
    this.currentPart?.stop();
    this.currentPart?.dispose();
    this.currentPart = null;
    Tone.Transport.stop();
    Tone.Transport.cancel();
    useStore.getState().setPlaybackState('IDLE');
  }

  private midiNoteToTone(midi: number): string {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    const name = notes[midi % 12];
    return `${name}${octave}`;
  }
}

export const playbackEngine = new PlaybackEngine();
