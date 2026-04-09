import React from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import ConfigWizard from './components/ConfigWizard';
import MIDITape from './components/MIDITape';
import { useStore } from './store/useStore';
const App: React.FC = () => {
  const { view } = useStore();

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {view === 'WELCOME' && <WelcomeScreen />}
      {view === 'WIZARD' && <ConfigWizard />}
      {view === 'WORKBENCH' && <MIDITape />}
    </div>
  );
};

export default App;
