import * as Tone from 'tone';

class TimingEngine {
  private audioCtx: AudioContext | null = null;
  private nextNoteTime = 0.0;
  private lookahead = 25.0; // ms
  private scheduleAheadTime = 0.1; // seconds
  private timerID: number | null = null;
  private bpm = 65;
  private bar = 1;
  private beat = 1;
  private onTick: ((bar: number, beat: number, time: number) => void) | null = null;

  async init() {
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  setBPM(bpm: number) {
    this.bpm = bpm;
  }

  start(onTick: (bar: number, beat: number, time: number) => void) {
    if (!this.audioCtx) return;
    this.onTick = onTick;
    this.nextNoteTime = this.audioCtx.currentTime;
    this.bar = 1;
    this.beat = 1;
    this.scheduler();
  }

  stop() {
    if (this.timerID) window.clearTimeout(this.timerID);
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.bpm;
    this.nextNoteTime += secondsPerBeat;
    
    this.beat++;
    if (this.beat > 4) {
      this.beat = 1;
      this.bar++;
    }
  }

  private scheduler() {
    while (this.audioCtx && this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      this.onTick?.(this.bar, this.beat, this.nextNoteTime);
      this.nextNote();
    }
    this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  getCurrentTime() {
    return this.audioCtx?.currentTime || 0;
  }
}

export const timingEngine = new TimingEngine();
