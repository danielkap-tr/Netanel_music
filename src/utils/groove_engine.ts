export interface GrooveInfo {
  offset: number; // ms offset from grid
  gridNote: number; // pulse index
}

export function getGrooveOffset(timeMs: number, bpm: number, resolution: number = 16): GrooveInfo {
  const beatDuration = 60000 / bpm;
  const gridDuration = beatDuration / (resolution / 4); // E.g. 1/16th occupies 1/4 of a beat (actually 4 notes per beat)
  // Wait, 1/4 note is 1 beat. 1/16 note is 1/4 of a beat.
  
  const pulseIndex = Math.round(timeMs / gridDuration);
  const gridTime = pulseIndex * gridDuration;
  const offset = timeMs - gridTime;

  return {
    offset: Math.round(offset * 100) / 100,
    gridNote: pulseIndex
  };
}
