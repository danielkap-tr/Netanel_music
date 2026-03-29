const CHORD_MAP: Record<string, string> = {
  '0,4,7': 'Major',
  '0,3,7': 'Minor',
  '0,4,7,10': '7',
  '0,4,7,11': 'Major 7',
  '0,3,7,10': 'Minor 7',
  '0,5,7': 'Sus4',
  '0,2,7': 'Sus2',
  '0,4,8': 'Aug',
  '0,3,6': 'Dim'
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function detectChord(notes: number[]): { root: string, type: string } | null {
  if (notes.length < 3) return null;

  // Sort and remove octaves
  const normalized = Array.from(new Set(notes.map(n => n % 12))).sort((a, b) => a - b);
  
  // Try each note as root
  for (let i = 0; i < normalized.length; i++) {
    const root = normalized[i];
    const relative = normalized.map(n => (n - root + 12) % 12).sort((a, b) => a - b);
    const key = relative.join(',');
    
    if (CHORD_MAP[key]) {
      return {
        root: NOTE_NAMES[root],
        type: CHORD_MAP[key]
      };
    }
  }

  return null;
}
