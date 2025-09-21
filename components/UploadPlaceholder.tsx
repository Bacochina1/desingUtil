import React, { useRef } from 'react';
import { UploadIcon } from './Icons';

interface UploadPlaceholderProps {
  onFileUploaded: (file: File) => void;
  title: string;
  description?: string;
  buttonOnly?: boolean;
}

export const UploadPlaceholder: React.FC<UploadPlaceholderProps> = ({ onFileUploaded, title, description, buttonOnly = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUploaded(file);
    }
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
        onFileUploaded(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  if (buttonOnly) {
     return (
        <>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            <button onClick={triggerFileSelect} className="mt-2 text-sm text-indigo-400 hover:text-indigo-300 underline">
                {title}
            </button>
        </>
     )
  }

  return (
    <div 
        className="w-full min-h-[400px] h-full flex flex-col items-center justify-center bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl text-center p-8 animate-fade-in"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
    >
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      <UploadIcon className="w-16 h-16 text-slate-500 mb-4" />
      <h2 className="text-2xl font-bold text-slate-200">{title}</h2>
      {description && <p className="text-slate-400 mt-2">{description}</p>}
      <button onClick={triggerFileSelect} className="mt-6 flex items-center bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-500 transition-colors">
          <UploadIcon className="w-5 h-5 mr-2" />
          Select Image
      </button>
      <p className="text-sm text-slate-500 mt-4">or drag & drop an image here</p>
    </div>
  );
};