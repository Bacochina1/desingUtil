import React, { useState } from 'react';
import { fileToBase64, vectorizeImage } from '../services/geminiService';
import { Spinner } from './Spinner';
import { VectorizeIcon, DownloadIcon, CopyIcon, CheckIcon } from './Icons';
import { UploadPlaceholder } from './UploadPlaceholder';

export const VectorizePane: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<{ url: string; mimeType: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [svgCode, setSvgCode] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleFileUploaded = async (file: File) => {
    if (file) {
      const base64 = await fileToBase64(file);
      setSourceImage({ url: base64, mimeType: file.type });
      setSvgCode(null);
      setError(null);
    }
  };

  const handleVectorize = async () => {
    if (!sourceImage) {
      setError('Please upload an image first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSvgCode(null);
    try {
      const result = await vectorizeImage(sourceImage.url, sourceImage.mimeType);
      setSvgCode(result);
    } catch (e) {
      setError('Failed to vectorize image. The model may not have returned valid SVG. Please try a different image.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (svgCode) {
      navigator.clipboard.writeText(svgCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (svgCode) {
      const blob = new Blob([svgCode], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vectorized-${Date.now()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };
  
  if (!sourceImage) {
    return (
        <UploadPlaceholder
            onFileUploaded={handleFileUploaded}
            title="Upload an Image to Vectorize"
            description="Convert any raster image (PNG, JPG) into a scalable vector graphic (SVG)."
        />
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl shadow-2xl p-8 animate-fade-in border border-slate-700">
       <h2 className="text-3xl font-bold text-indigo-400 mb-2 text-center">Image Vectorizer</h2>
      <p className="text-slate-400 mb-8 text-center">Convert your image into a clean, scalable SVG.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col items-center space-y-4">
            <h3 className="text-xl font-semibold text-slate-300">Source Image</h3>
            <div className="p-2 bg-slate-700 rounded-lg">
                <img src={sourceImage.url} alt="Source for vectorization" className="rounded-md shadow-lg max-w-full h-auto max-h-80 object-contain" />
            </div>
            <button
                onClick={handleVectorize}
                disabled={isLoading}
                className="w-full flex items-center justify-center bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
                {isLoading ? (
                    <>
                    <Spinner />
                    Vectorizing...
                    </>
                ) : (
                    <>
                    <VectorizeIcon className="w-5 h-5 mr-2" />
                    Vectorize Image
                    </>
                )}
            </button>
             <UploadPlaceholder onFileUploaded={handleFileUploaded} title="Upload New Image" buttonOnly />
        </div>

        <div className="flex flex-col items-center">
            <h3 className="text-xl font-semibold text-slate-300 mb-4">Result (SVG)</h3>
            <div className="w-full aspect-square p-2 bg-white rounded-lg shadow-inner flex items-center justify-center">
                {isLoading ? (
                     <div className="flex flex-col items-center justify-center text-slate-600">
                        <Spinner />
                        <p className="mt-2">Generating SVG...</p>
                    </div>
                ) : svgCode ? (
                    <img src={`data:image/svg+xml;base64,${btoa(svgCode)}`} alt="Vectorized result" className="max-w-full max-h-full" />
                ) : (
                    <div className="text-center text-slate-500 p-4">
                        <VectorizeIcon className="w-16 h-16 mx-auto mb-4" />
                        <p>Your vectorized image will appear here.</p>
                    </div>
                )}
            </div>
            {svgCode && !isLoading && (
                <div className="w-full flex space-x-4 mt-4">
                    <button
                        onClick={handleCopy}
                        className="w-full flex items-center justify-center bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-500 transition-colors"
                    >
                        {isCopied ? <CheckIcon className="w-5 h-5 mr-2 text-green-400" /> : <CopyIcon className="w-5 h-5 mr-2" />}
                        {isCopied ? 'Copied!' : 'Copy Code'}
                    </button>
                    <button
                        onClick={handleDownload}
                        className="w-full flex items-center justify-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-500 transition-colors"
                    >
                        <DownloadIcon className="w-5 h-5 mr-2" />
                        Download .svg
                    </button>
                </div>
            )}
        </div>
      </div>
      {error && <p className="text-red-400 mt-6 text-center">{error}</p>}
    </div>
  );
};