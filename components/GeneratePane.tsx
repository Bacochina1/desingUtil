import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';
import { AspectRatio } from '../types';
import { ASPECT_RATIOS } from '../constants';
import { Spinner } from './Spinner';
import { GenerateIcon } from './Icons';

interface GeneratePaneProps {
  onImageGenerated: (imageUrl: string) => void;
}

export const GeneratePane: React.FC<GeneratePaneProps> = ({ onImageGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const imageUrl = await generateImage(prompt, aspectRatio);
      onImageGenerated(imageUrl);
    } catch (e) {
      setError('Failed to generate image. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl shadow-2xl p-8 flex flex-col items-center animate-fade-in border border-slate-700">
      <h2 className="text-3xl font-bold text-indigo-400 mb-4">Image Generation</h2>
      <p className="text-slate-400 mb-8 max-w-2xl text-center">Describe the image you want to create. Be as detailed as you like for the best results.</p>
      
      <div className="w-full max-w-3xl space-y-6">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., A cinematic shot of a smiling astronaut on Mars, detailed suit, red planet background"
          className="w-full h-32 p-4 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 resize-none"
          disabled={isLoading}
        />
        <div className="flex items-center space-x-4">
          <label htmlFor="aspect-ratio" className="font-semibold text-slate-300">Aspect Ratio:</label>
          <select
            id="aspect-ratio"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            className="bg-slate-700 border border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
            disabled={isLoading}
          >
            {ASPECT_RATIOS.map((ratio) => (
              <option key={ratio} value={ratio}>{ratio}</option>
            ))}
          </select>
        </div>
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
        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
      </div>
       <div className="mt-8 text-center text-slate-500 text-sm">
        <p>Pro Tip: Use descriptive adjectives and specify the style (e.g., "photorealistic", "oil painting", "anime style").</p>
      </div>
    </div>
  );
};