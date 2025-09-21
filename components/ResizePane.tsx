import React, { useState, useMemo } from 'react';
import { DownloadIcon, ResizeIcon } from './Icons';
import { AspectRatio } from '../types';

const PRESETS: { name: string, ratio: AspectRatio, width: number, height: number }[] = [
    { name: 'Square (1:1)', ratio: '1:1', width: 1024, height: 1024 },
    { name: 'Widescreen (16:9)', ratio: '16:9', width: 1920, height: 1080 },
    { name: 'Portrait (9:16)', ratio: '9:16', width: 1080, height: 1920 },
    { name: 'Standard (4:3)', ratio: '4:3', width: 1024, height: 768 },
    { name: 'Photo (3:4)', ratio: '3:4', width: 768, height: 1024 },
];

export const ResizePane: React.FC = () => {
    const [width, setWidth] = useState(1024);
    const [height, setHeight] = useState(1024);

    const handlePresetClick = (preset: typeof PRESETS[0]) => {
        setWidth(preset.width);
        setHeight(preset.height);
    };

    const handleDownload = () => {
        if (width <= 0 || height <= 0) {
            alert("Please enter valid dimensions greater than 0.");
            return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        // The canvas is transparent by default, no need to draw anything.

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `transparent_${width}x${height}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const aspectRatio = useMemo(() => {
        if (width > 0 && height > 0) {
            return (width / height) * 100;
        }
        return 100; // Default to square
    }, [width, height]);


    return (
        <div className="bg-slate-800 rounded-xl shadow-2xl p-8 flex flex-col items-center animate-fade-in border border-slate-700">
            <h2 className="text-3xl font-bold text-indigo-400 mb-4">Transparent Canvas Generator</h2>
            <p className="text-slate-400 mb-8 max-w-2xl text-center">Create a blank, transparent PNG file with your desired dimensions. Perfect for starting new projects or as a base layer.</p>

            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                {/* Controls */}
                <div className="space-y-8">
                     <div>
                        <h3 className="text-xl font-semibold text-slate-300 mb-4">Custom Dimensions</h3>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="width" className="block text-sm font-medium text-slate-300">Width (px)</label>
                                <input
                                    type="number"
                                    id="width"
                                    value={width}
                                    onChange={(e) => setWidth(Number(e.target.value))}
                                    className="w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                    min="1"
                                />
                            </div>
                            <div>
                                <label htmlFor="height" className="block text-sm font-medium text-slate-300">Height (px)</label>
                                <input
                                    type="number"
                                    id="height"
                                    value={height}
                                    onChange={(e) => setHeight(Number(e.target.value))}
                                    className="w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                    min="1"
                                />
                            </div>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-slate-300 mb-4">Or Use Presets</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {PRESETS.map(p => (
                                <button
                                    key={p.name}
                                    onClick={() => handlePresetClick(p)}
                                    className="text-sm text-center p-3 bg-slate-700 rounded-md hover:bg-slate-600 transition"
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>
                    </div>
                     <button
                        onClick={handleDownload}
                        disabled={width <= 0 || height <= 0}
                        className="w-full flex items-center justify-center bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
                    >
                        <DownloadIcon className="w-5 h-5 mr-2" />
                        Download PNG
                    </button>
                </div>

                {/* Preview */}
                <div className="flex flex-col items-center">
                     <h3 className="text-xl font-semibold text-slate-300 mb-4">Preview</h3>
                     <div className="w-full bg-grid-transparent rounded-lg p-4 border border-slate-700 shadow-inner" style={{ backgroundSize: '20px 20px', backgroundPosition: '0 0', backgroundImage: 'linear-gradient(45deg, #334155 25%, transparent 25%), linear-gradient(-45deg, #334155 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #334155 75%), linear-gradient(-45deg, transparent 75%, #334155 75%)'}}>
                        <div
                            className="relative w-full mx-auto bg-transparent border-2 border-dashed border-indigo-400 rounded-md transition-all duration-300"
                            style={{ paddingTop: `${100 / (width / height)}%` }}
                        >
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-white bg-slate-900/70 px-3 py-1 rounded-md font-mono text-sm">{width} x {height}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};