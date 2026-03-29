import React from 'react';
import MIDITape from './components/MIDITape';

const App: React.FC = () => {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <MIDITape />
    </div>
  );
};

export default App;
