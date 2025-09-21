import React, { useState } from 'react';
import { fileToBase64, createMockup } from '../services/geminiService';
import { Spinner } from './Spinner';
import { GenerateIcon, MockupIcon, EditIcon } from './Icons';
import { UploadPlaceholder } from './UploadPlaceholder';

interface MockupPaneProps {
  onImageGenerated: (imageUrl: string) => void;
}

const MOCKUP_TEMPLATES = [
  {
    name: 'T-Shirt',
    prompt: 'Place the provided design onto the front of a photorealistic plain white t-shirt. The t-shirt should be worn by a person in a neutral, well-lit studio setting. Ensure the design follows the fabric\'s contours, folds, and texture, and that lighting and shadows on the design are consistent with the scene.',
  },
  {
    name: 'Laptop Screen',
    prompt: 'Place the provided image onto the screen of a modern, sleek laptop. The laptop should be on a clean wooden desk, viewed from a slight angle. The image on the screen should have a subtle glare to look realistic and be perfectly fitted to the screen boundaries.',
  },
  {
    name: 'Coffee Mug',
    prompt: 'Apply the provided design onto the side of a white ceramic coffee mug. The mug should be sitting on a kitchen counter with soft, natural lighting. The design should wrap around the mug\'s curve realistically.',
  },
  {
    name: 'Poster on Wall',
    prompt: 'Place the provided image as a poster within a frame hanging on a clean, minimalist interior wall. The scene should be well-lit, and the poster should have realistic reflections on its glass frame.',
  }
];

export const MockupPane: React.FC<MockupPaneProps> = ({ onImageGenerated }) => {
  const [designImage, setDesignImage] = useState<{ url: string; mimeType: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);

  const handleFileUploaded = async (file: File) => {
    if (file) {
      const base64 = await fileToBase64(file);
      setDesignImage({ url: base64, mimeType: file.type });
      setResultImage(null);
      setError(null);
    }
  };

  const handleGenerate = async (prompt: string) => {
    if (!designImage) {
      setError('Please upload a design image first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResultImage(null);
    try {
      const imageUrl = await createMockup(designImage.url, designImage.mimeType, prompt);
      setResultImage(imageUrl);
    } catch (e) {
      setError('Failed to generate mockup. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEditResult = () => {
    if(resultImage) {
        onImageGenerated(resultImage);
    }
  }

  if (!designImage) {
    return (
        <UploadPlaceholder
            onFileUploaded={handleFileUploaded}
            title="Upload Your Design"
            description="Upload a logo, artwork, or any image to place onto a mockup."
        />
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl shadow-2xl p-8 animate-fade-in border border-slate-700">
      <h2 className="text-3xl font-bold text-indigo-400 mb-2 text-center">Create a Mockup</h2>
      <p className="text-slate-400 mb-8 text-center">Your design is loaded. Now, choose a template to apply it to.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 flex flex-col items-center space-y-4">
          <h3 className="text-xl font-semibold text-slate-300">Your Design</h3>
          <img src={designImage.url} alt="User design" className="rounded-lg shadow-lg max-w-full h-auto max-h-64 object-contain" />
           <UploadPlaceholder onFileUploaded={handleFileUploaded} title="Upload New Design" buttonOnly />
        </div>
        
        <div className="md:col-span-2">
            {resultImage ? (
                <div className="flex flex-col items-center text-center">
                    <h3 className="text-2xl font-semibold text-slate-300 mb-4">Mockup Result</h3>
                    <img src={resultImage} alt="Generated mockup" className="rounded-lg shadow-2xl max-w-full h-auto max-h-96 mb-4" />
                     <div className="flex space-x-4">
                        <button
                          onClick={handleEditResult}
                          className="flex items-center justify-center bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-500 transition-all duration-200 transform hover:scale-105 shadow-lg"
                        >
                          <EditIcon className="w-5 h-5 mr-2" />
                          Edit in Editor
                        </button>
                    </div>
                </div>
            ) : isLoading ? (
                <div className="w-full h-96 flex flex-col items-center justify-center bg-slate-900/50 rounded-lg">
                    <Spinner />
                    <p className="mt-4 text-lg text-slate-300">Generating your mockup...</p>
                </div>
            ) : (
                <div>
                  <h3 className="text-xl font-semibold text-slate-300 mb-4 text-center md:text-left">Select a Template</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {MOCKUP_TEMPLATES.map(template => (
                      <button
                        key={template.name}
                        onClick={() => handleGenerate(template.prompt)}
                        disabled={isLoading}
                        className="flex items-center justify-center text-center p-4 bg-slate-700 rounded-lg hover:bg-slate-600 hover:ring-2 hover:ring-indigo-500 transition-all duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed"
                      >
                         <MockupIcon className="w-6 h-6 mr-3 text-indigo-400" />
                        <span className="font-semibold">{template.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
            )}
             {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        </div>
      </div>
    </div>
  );
};