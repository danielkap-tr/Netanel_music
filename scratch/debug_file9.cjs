const fs = require('fs');
const path = require('path');

const midiPath = 'C:\\Users\\kaplu\\Downloads\\AI_Professional_Ensemble_pop-dance (16).mid';

if (!fs.existsSync(midiPath)) {
    console.error('File not found:', midiPath);
    process.exit(1);
}

const buffer = fs.readFileSync(midiPath);
console.log('File Size:', buffer.length, 'bytes');

// Basic MIDI Header Check
if (buffer.toString('ascii', 0, 4) !== 'MThd') {
    console.error('Not a valid MIDI file header');
} else {
    const numTracks = buffer.readUInt16BE(10);
    console.log('Number of Tracks:', numTracks);
}

// Low-level scan for Note On events (0x9n)
const channels = {};
const drumNotes = {};

for (let i = 0; i < buffer.length - 2; i++) {
    const status = buffer[i];
    if ((status & 0xF0) === 0x90) { // Note On
        const ch = status & 0x0F;
        const note = buffer[i+1];
        const vel = buffer[i+2];
        if (vel > 0) {
            channels[ch + 1] = (channels[ch + 1] || 0) + 1;
            if (ch === 9) { // Drums (Ch 10)
                drumNotes[note] = (drumNotes[note] || 0) + 1;
            }
        }
    }
}

console.log('Channel Note Counts (1-indexed):', channels);
console.log('Drum Note Usage (MIDI Note -> Count):', drumNotes);

if (drumNotes[46]) {
    console.log('SUCCESS: Open Hi-Hat (46) detected in track!');
} else {
    console.warn('WARNING: Open Hi-Hat (46) MISSING from drums.');
}

if (channels[2]) {
    console.log('SUCCESS: Bass Track (Channel 2) detected!');
}const midi = fs.readFileSync('C:/Users/kaplu/Downloads/AI_Professional_Ensemble_freilach (9).mid');const parse = require('midi-file').parse; const data = parse(midi); let res = { counts: {}, drums: {} }; data.tracks.forEach(t => t.forEach(e => { if (e.type === 'noteOn') { let ch = e.channel + 1; res.counts[ch] = (res.counts[ch] || 0) + 1; if (ch === 10) res.drums[e.noteNumber] = (res.drums[e.noteNumber] || 0) + 1; } })); console.log(JSON.stringify(res, null, 2));