import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { GeneratePane } from './components/GeneratePane';
import { EditPane } from './components/EditPane';
import { DoodlePane } from './components/DoodlePane';
import { MockupPane } from './components/MockupPane';
import { VectorizePane } from './components/VectorizePane';
import { Mode } from './types';
import { LogoIcon } from './components/Icons';

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('generate');
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  const handleModeChange = useCallback((newMode: Mode) => {
    setMode(newMode);
    if (newMode !== 'edit') {
      setCurrentImage(null);
    }
  }, []);

  const handleImageReadyForEdit = (imageUrl: string) => {
    setCurrentImage(imageUrl);
    setMode('edit');
  };
  
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Header currentMode={mode} onModeChange={handleModeChange} />
      <main className="flex-grow flex flex-col items-center justify-start p-6 md:p-10">
        <div className="w-full max-w-7xl mx-auto">
          {mode === 'generate' && <GeneratePane onImageGenerated={handleImageReadyForEdit} />}
          {mode === 'doodle' && <DoodlePane onImageGenerated={handleImageReadyForEdit} />}
          {mode === 'mockup' && <MockupPane onImageGenerated={handleImageReadyForEdit} />}
          {mode === 'vectorize' && <VectorizePane />}
          {mode === 'edit' && (
            <EditPane 
              key={currentImage} // Force re-mount when image changes to reset state
              initialImage={currentImage} 
              onImageUploaded={handleImageReadyForEdit}
            />
          )}
        </div>
      </main>
      <footer className="w-full text-center p-4 text-xs text-slate-500 flex items-center justify-center">
         <LogoIcon className="h-4 w-4 mr-2 text-indigo-400" />
        Powered by Meu Design Útil Engine via Gemini API
      </footer>
    </div>
  );
};

export default App;