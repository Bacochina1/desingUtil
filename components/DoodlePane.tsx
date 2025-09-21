import React, { useState, useRef } from 'react';
import { generateFromDoodle } from '../services/geminiService';
import { Spinner } from './Spinner';
import { GenerateIcon, RedoIcon } from './Icons';
import { DrawingCanvas, DrawingCanvasRef } from './DrawingCanvas';

interface DoodlePaneProps {
  onImageGenerated: (imageUrl: string) => void;
}

export const DoodlePane: React.FC<DoodlePaneProps> = ({ onImageGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<DrawingCanvasRef>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || !canvasRef.current) {
      setError('Please enter a prompt and draw a sketch.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { dataUrl, mimeType } = canvasRef.current.getCanvasData();
      const imageUrl = await generateFromDoodle(dataUrl, mimeType, prompt);
      onImageGenerated(imageUrl);
    } catch (e) {
      setError('Failed to generate image from doodle. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl shadow-2xl p-8 flex flex-col items-center animate-fade-in border border-slate-700">
      <h2 className="text-3xl font-bold text-indigo-400 mb-4">Stable Doodle</h2>
      <p className="text-slate-400 mb-8 max-w-2xl text-center">Turn your simple sketch into a detailed masterpiece. Draw an outline, describe your vision, and let the AI bring it to life.</p>
      
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col space-y-4">
            <div className="aspect-square bg-white rounded-lg overflow-hidden shadow-inner border border-slate-600">
                 <DrawingCanvas ref={canvasRef} />
            </div>
             <button
                onClick={() => canvasRef.current?.clearCanvas()}
                disabled={isLoading}
                className="w-full flex items-center justify-center bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-500 disabled:bg-slate-700 transition"
                >
                <RedoIcon className="w-5 h-5 mr-2" />
                Clear Sketch
            </button>
        </div>

        <div className="flex flex-col space-y-4">
            <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., A cute cat wearing a wizard hat, magical, fantasy art style."
            className="w-full h-48 p-4 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 resize-none"
            disabled={isLoading}
            />
            <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="w-full flex items-center justify-center bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
            {isLoading ? (
                <>
                <Spinner />
                Generating...
                </>
            ) : (
                <>
                <GenerateIcon className="w-5 h-5 mr-2" />
                Generate Image
                </>
            )}
            </button>
            {error && <p className="text-red-400 mt-2 text-center">{error}</p>}
        </div>
      </div>
       <div className="mt-8 text-center text-slate-500 text-sm">
        <p>Pro Tip: Simple, clear outlines work best as a guide for the AI.</p>
      </div>
    </div>
  );
};