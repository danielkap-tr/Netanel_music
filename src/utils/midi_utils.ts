const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiNoteToName(note: number): string {
  const name = NOTE_NAMES[note % 12];
  const octave = Math.floor(note / 12) - 1;
  return `${name}${octave}`;
}

export function nameToMidiNote(name: string): number {
  const matches = name.match(/^([A-Ga-g#]+)(-?\d+)$/);
  if (!matches) return 60;
  const [_, noteName, octave] = matches;
  const index = NOTE_NAMES.indexOf(noteName.toUpperCase());
  return (parseInt(octave) + 1) * 12 + index;
}
