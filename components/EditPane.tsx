import React, { useState, useRef, useEffect } from 'react';
import { ImageCanvas, ImageCanvasRef } from './ImageCanvas';
import { fileToBase64, editImage, upscaleImage, removeText, replaceSky } from '../services/geminiService';
import { Spinner } from './Spinner';
import { DownloadIcon, EditIcon, ExpandIcon, UploadIcon, RedoIcon, SunIcon, BackgroundIcon, ChevronDownIcon, UpscaleIcon, TextRemoveIcon, SkyIcon, ResizeIcon } from './Icons';
import { AspectRatio, EditTool } from '../types';
import { UploadPlaceholder } from './UploadPlaceholder';

interface EditPaneProps {
  initialImage: string | null;
  onImageUploaded: (imageUrl: string) => void;
}

const ToolAccordion: React.FC<{
  title: string;
  icon: React.ElementType;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, icon: Icon, isOpen, onToggle, children }) => {
  return (
    <div className="border-b border-slate-700/50">
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center p-4 text-left text-slate-200 hover:bg-slate-700/50 transition"
      >
        <div className="flex items-center">
          <Icon className={`w-5 h-5 mr-3 ${isOpen ? 'text-indigo-400' : 'text-slate-400'}`} />
          <h3 className={`text-md font-semibold ${isOpen ? 'text-indigo-400' : ''}`}>{title}</h3>
        </div>
        <ChevronDownIcon className={`w-6 h-6 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-4 pt-0">
          {children}
        </div>
      )}
    </div>
  );
};


export const EditPane: React.FC<EditPaneProps> = ({ initialImage, onImageUploaded }) => {
  const [image, setImage] = useState<string | null>(initialImage);
  const [originalImage, setOriginalImage] = useState<string | null>(initialImage);
  
  const [prompt, setPrompt] = useState('');
  const [brushSize, setBrushSize] = useState(40);
  const [brushOpacity, setBrushOpacity] = useState(0.7);
  const [brushHardness, setBrushHardness] = useState(1);
  const [relightPrompt, setRelightPrompt] = useState('');
  const [backgroundPrompt, setBackgroundPrompt] = useState('');
  const [skyPrompt, setSkyPrompt] = useState('');
  const [resizeWidth, setResizeWidth] = useState(1024);
  const [resizeHeight, setResizeHeight] = useState(1024);

  const [activeTool, setActiveTool] = useState<EditTool | null>('inpainting');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');

  const canvasRef = useRef<ImageCanvasRef>(null);
  
  const maskColor = `rgba(255, 0, 255, ${brushOpacity})`;

  useEffect(() => {
    setImage(initialImage);
    setOriginalImage(initialImage);
    const img = new Image();
    img.src = initialImage ?? '';
    img.onload = () => {
        setResizeWidth(img.naturalWidth);
        setResizeHeight(img.naturalHeight);
    };
  }, [initialImage]);
  
  const handleFileUploaded = async (file: File) => {
    if (file) {
      const base64 = await fileToBase64(file);
      onImageUploaded(base64);
    }
  };
  
  const handleToggleTool = (tool: EditTool) => {
    setActiveTool(activeTool === tool ? null : tool);
  };
  
  const executeEditAction = async (action: () => Promise<string>, message: string) => {
    if (!image) return;
    setIsLoading(true);
    setLoadingMessage(message);
    setError(null);
    try {
      const result = await action();
      setImage(result);
    } catch (e) {
      console.error(e);
      setError(`Failed to ${message.toLowerCase().replace('...', '')}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    if (!prompt.trim() || !canvasRef.current) return;
    executeEditAction(async () => {
      const { compositeImage, mimeType } = await canvasRef.current!.getCompositeImageWithMask();
      const editPrompt = `In the image provided, the area marked in magenta must be replaced with: "${prompt}". The replacement must be photorealistic and seamlessly blended. CRUCIAL: The new content must perfectly match the ambient lighting, shadows, color grading, grain, and texture of the surrounding original image to create a completely realistic and undetectable edit. Do not leave any magenta artifacts.`;
      const result = await editImage(compositeImage, mimeType, editPrompt);
      canvasRef.current?.clearMask();
      setPrompt('');
      return result;
    }, 'Applying edits...');
  };

  const handleRemoveBackground = () => executeEditAction(async () => {
    const mimeType = image!.split(';')[0].split(':')[1];
    const bgPrompt = `Please remove the background from this image. Isolate the main subject and make the background transparent. The output must be a high-quality PNG with a transparent background.`;
    return editImage(image!, mimeType, bgPrompt);
  }, 'Removing background...');
  
  const handleReplaceBackground = () => {
    if (!backgroundPrompt.trim()) return;
    executeEditAction(async () => {
        const mimeType = image!.split(';')[0].split(':')[1];
        const replacePrompt = `The provided image contains a subject, likely on a transparent background. Place this subject into a new scene described as: "${backgroundPrompt}". The final image must be a cohesive scene with realistic lighting, shadows, and perspective, making the subject naturally fit into the new environment.`;
        return editImage(image!, mimeType, replacePrompt);
    }, 'Replacing background...');
  };
  
  const handleRelight = () => {
    if (!relightPrompt.trim()) return;
    executeEditAction(async () => {
        const mimeType = image!.split(';')[0].split(':')[1];
        const lightPrompt = `Apply new lighting to this image based on these instructions: "${relightPrompt}". The changes must be photorealistic, affecting highlights, shadows, and color consistently across the image.`;
        return editImage(image!, mimeType, lightPrompt);
    }, 'Applying lighting...');
  };
  
  const handleExpand = () => {
    if (!canvasRef.current) return;
    executeEditAction(async () => {
      const { expandedImage, mimeType } = await canvasRef.current!.getFinalExpandedImage();
      const expandPrompt = `This is an image that has been expanded. The transparent area needs to be filled. Please complete the image by realistically extending the existing scene into the transparent region. Ensure the transition is seamless and the style is consistent with the original image.`;
      return editImage(expandedImage, mimeType, expandPrompt);
    }, 'Expanding image...');
  };

  const handleUpscale = () => executeEditAction(async () => {
      const mimeType = image!.split(';')[0].split(':')[1];
      return upscaleImage(image!, mimeType);
  }, 'Upscaling image...');

  const handleRemoveText = () => executeEditAction(async () => {
      const mimeType = image!.split(';')[0].split(':')[1];
      return removeText(image!, mimeType);
  }, 'Removing text...');
  
  const handleReplaceSky = () => {
    if (!skyPrompt.trim()) return;
    executeEditAction(async () => {
        const mimeType = image!.split(';')[0].split(':')[1];
        return replaceSky(image!, mimeType, skyPrompt);
    }, 'Replacing sky...');
  };

  const handleAspectRatioPreset = (ratio: AspectRatio) => {
    canvasRef.current?.setAspectRatio(ratio);
  };

  const handleSetCanvasSize = () => {
    if (resizeWidth > 0 && resizeHeight > 0) {
        canvasRef.current?.setExplicitCanvasSize(resizeWidth, resizeHeight);
    }
  };

  const handleDownload = () => {
    if (image) {
      const link = document.createElement('a');
      link.href = image;
      link.download = `meu-design-util-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  const handleRevert = () => {
      setImage(originalImage);
      canvasRef.current?.reset();
  }
  
  const relightPresets = {
    "Golden Hour": "dramatic, warm, golden hour lighting from the side",
    "Studio Light": "clean, bright, and even studio lighting with soft shadows",
    "Neon Noir": "cinematic, high-contrast lighting with neon blue and pink highlights",
    "Moonlight": "soft, cool, moonlight casting long shadows"
  };

  const aspectRatioPresets: { name: string, ratio: AspectRatio }[] = [
    { name: 'Square', ratio: '1:1' },
    { name: 'Portrait', ratio: '4:3' },
    { name: 'Widescreen', ratio: '16:9' },
    { name: 'Tall', ratio: '9:16' },
  ];

  if (!image) {
    return (
      <UploadPlaceholder 
        onFileUploaded={handleFileUploaded}
        title="Upload an Image to Get Started"
        description="You can also generate an image first in the 'Generate' or 'Doodle' tab."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      <div className="lg:col-span-2 relative bg-slate-900 p-4 rounded-xl shadow-inner min-h-[70vh] border border-slate-700">
        {isLoading && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-30 rounded-xl">
            <Spinner />
            <p className="mt-4 text-lg font-semibold">{loadingMessage}</p>
          </div>
        )}
        <ImageCanvas 
          ref={canvasRef} 
          src={image} 
          brushSize={brushSize} 
          brushColor={maskColor}
          brushOpacity={brushOpacity}
          brushHardness={brushHardness}
          activeTool={(activeTool === 'inpainting' || activeTool === 'expand' || activeTool === 'resize') ? activeTool : null}
        />
      </div>

      <div className="bg-slate-800 rounded-xl shadow-2xl h-fit border border-slate-700">
        <div className="rounded-lg overflow-hidden">
          <ToolAccordion title="Inpainting (Cleanup)" icon={EditIcon} isOpen={activeTool === 'inpainting'} onToggle={() => handleToggleTool('inpainting')}>
              <p className="text-sm text-slate-400 mb-4">Paint over areas to change, then describe the replacement.</p>
              <div className="space-y-4">
                  <div>
                      <label htmlFor="brush-size" className="block text-sm font-medium text-slate-300 mb-1">Brush Size: {brushSize}px</label>
                      <input id="brush-size" type="range" min="5" max="150" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                  </div>
                  <div>
                        <label htmlFor="brush-opacity" className="block text-sm font-medium text-slate-300 mb-1">Brush Opacity: {Math.round(brushOpacity * 100)}%</label>
                      <input id="brush-opacity" type="range" min="0.1" max="1" step="0.05" value={brushOpacity} onChange={(e) => setBrushOpacity(Number(e.target.value))} className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                  </div>
                  <div>
                      <label htmlFor="brush-hardness" className="block text-sm font-medium text-slate-300 mb-1">Brush Hardness: {Math.round(brushHardness * 100)}%</label>
                      <input id="brush-hardness" type="range" min="0.01" max="1" step="0.01" value={brushHardness} onChange={(e) => setBrushHardness(Number(e.target.value))} className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                  </div>
                  <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe your changes..." className="w-full h-24 p-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none" />
                  <button onClick={handleEdit} disabled={!prompt.trim() || isLoading} className="w-full flex justify-center items-center bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 transition">
                      <EditIcon className="w-5 h-5 mr-2" /> Apply Inpainting
                  </button>
              </div>
          </ToolAccordion>
          
           <ToolAccordion title="Expansion (Uncrop)" icon={ExpandIcon} isOpen={activeTool === 'expand'} onToggle={() => handleToggleTool('expand')}>
            <p className="text-sm text-slate-400 mb-4">Choose a preset or drag handles to resize.</p>
             <div className="grid grid-cols-2 gap-2 mb-4">
                {aspectRatioPresets.map(({ name, ratio }) => (
                  <button key={name} onClick={() => handleAspectRatioPreset(ratio)} className="text-sm text-center p-2 bg-slate-600 rounded-md hover:bg-slate-500 transition">
                    {name} ({ratio})
                  </button>
                ))}
             </div>
            <button onClick={handleExpand} disabled={isLoading} className="w-full flex justify-center items-center bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 transition">
                  <ExpandIcon className="w-5 h-5 mr-2" /> Apply Expansion
              </button>
          </ToolAccordion>
          
          <ToolAccordion title="Resize & Canvas" icon={ResizeIcon} isOpen={activeTool === 'resize'} onToggle={() => handleToggleTool('resize')}>
              <p className="text-sm text-slate-400 mb-4">Set an exact canvas size in pixels.</p>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label htmlFor="resize-width" className="block text-sm font-medium text-slate-300">Width</label>
                      <input id="resize-width" type="number" value={resizeWidth} onChange={(e) => setResizeWidth(Number(e.target.value))} className="w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded-lg" />
                  </div>
                  <div>
                      <label htmlFor="resize-height" className="block text-sm font-medium text-slate-300">Height</label>
                      <input id="resize-height" type="number" value={resizeHeight} onChange={(e) => setResizeHeight(Number(e.target.value))} className="w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded-lg" />
                  </div>
              </div>
              <button onClick={handleSetCanvasSize} className="w-full mt-4 flex justify-center items-center bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-500 transition">
                   Set Canvas Size
              </button>
              <button onClick={handleExpand} disabled={isLoading} className="w-full mt-2 flex justify-center items-center bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 transition">
                  <ExpandIcon className="w-5 h-5 mr-2" /> Apply Resize & Fill
              </button>
          </ToolAccordion>

          <ToolAccordion title="Background Tools" icon={BackgroundIcon} isOpen={activeTool === 'background'} onToggle={() => handleToggleTool('background')}>
                <p className="text-sm text-slate-400 mb-4">Remove the background, then generate a new one.</p>
                <div className="space-y-3">
                  <button onClick={handleRemoveBackground} disabled={isLoading} className="w-full flex justify-center items-center bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 transition">
                      <BackgroundIcon className="w-5 h-5 mr-2" /> Remove Background
                  </button>
                  <textarea value={backgroundPrompt} onChange={(e) => setBackgroundPrompt(e.target.value)} placeholder="Describe new background..." className="w-full h-24 p-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none" />
                  <button onClick={handleReplaceBackground} disabled={!backgroundPrompt.trim() || isLoading} className="w-full flex justify-center items-center bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 transition">
                      <EditIcon className="w-5 h-5 mr-2" /> Replace Background
                  </button>
                </div>
          </ToolAccordion>

          <ToolAccordion title="Relighting" icon={SunIcon} isOpen={activeTool === 'relighting'} onToggle={() => handleToggleTool('relighting')}>
                <p className="text-sm text-slate-400 mb-4">Describe lighting changes or use a preset.</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {Object.entries(relightPresets).map(([name, value]) => (
                      <button key={name} onClick={() => setRelightPrompt(value)} className="text-xs text-center p-2 bg-slate-600 rounded-md hover:bg-slate-500 transition">
                          {name}
                      </button>
                  ))}
                </div>
              <textarea value={relightPrompt} onChange={(e) => setRelightPrompt(e.target.value)} placeholder="e.g., Add a warm golden hour glow..." className="w-full h-24 p-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none" />
              <button onClick={handleRelight} disabled={!relightPrompt.trim() || isLoading} className="w-full flex justify-center items-center bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-400 transition mt-2">
                   <SunIcon className="w-5 h-5 mr-2" /> Apply Lighting
              </button>
          </ToolAccordion>

          <ToolAccordion title="Sky Replacer" icon={SkyIcon} isOpen={activeTool === 'skyReplace'} onToggle={() => handleToggleTool('skyReplace')}>
              <p className="text-sm text-slate-400 mb-4">Describe the new sky you want to see.</p>
              <textarea value={skyPrompt} onChange={(e) => setSkyPrompt(e.target.value)} placeholder="e.g., A dramatic sunset with purple clouds..." className="w-full h-24 p-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none" />
              <button onClick={handleReplaceSky} disabled={!skyPrompt.trim() || isLoading} className="w-full flex justify-center items-center bg-sky-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-400 transition mt-2">
                  <SkyIcon className="w-5 h-5 mr-2" /> Replace Sky
              </button>
          </ToolAccordion>

          <ToolAccordion title="Text Remover" icon={TextRemoveIcon} isOpen={activeTool === 'textRemove'} onToggle={() => handleToggleTool('textRemove')}>
              <p className="text-sm text-slate-400 mb-4">Automatically remove text from the image.</p>
              <button onClick={handleRemoveText} disabled={isLoading} className="w-full flex justify-center items-center bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-400 transition">
                  <TextRemoveIcon className="w-5 h-5 mr-2" /> Remove Text
              </button>
          </ToolAccordion>

           <ToolAccordion title="Upscale Image" icon={UpscaleIcon} isOpen={activeTool === 'upscale'} onToggle={() => handleToggleTool('upscale')}>
              <p className="text-sm text-slate-400 mb-4">Increase image resolution and enhance details (2x).</p>
              <button onClick={handleUpscale} disabled={isLoading} className="w-full flex justify-center items-center bg-teal-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-400 disabled:bg-slate-700 disabled:text-slate-400 transition">
                  <UpscaleIcon className="w-5 h-5 mr-2" /> Upscale Image
              </button>
          </ToolAccordion>

        </div>
        {error && <p className="text-red-400 mt-4 text-center px-4">{error}</p>}
        <div className="mt-4 border-t border-slate-700 pt-4 flex flex-col space-y-3 p-4">
             <button onClick={handleRevert} disabled={isLoading || image === originalImage} className="w-full flex justify-center items-center bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed transition">
                <RedoIcon className="w-5 h-5 mr-2" /> Revert to Original
            </button>
            <button onClick={handleDownload} disabled={isLoading} className="w-full flex justify-center items-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-500 disabled:bg-slate-700 transition">
                <DownloadIcon className="w-5 h-5 mr-2" /> Download Image
            </button>
        </div>
      </div>
    </div>
  );
};