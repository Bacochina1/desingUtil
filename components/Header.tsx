import React from 'react';
import { Mode } from '../types';
import { LogoIcon, EditIcon, GenerateIcon, DoodleIcon, MockupIcon, VectorizeIcon } from './Icons';

interface HeaderProps {
  currentMode: Mode;
  onModeChange: (mode: Mode) => void;
}

const NavButton: React.FC<{
    isActive: boolean;
    onClick: () => void;
    Icon: React.ElementType;
    label: string;
}> = ({ isActive, onClick, Icon, label }) => {
    const baseClasses = "flex items-center space-x-2.5 px-4 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 text-sm font-medium";
    const activeClasses = "bg-indigo-600 text-white shadow-md";
    const inactiveClasses = "text-slate-300 hover:bg-slate-700 hover:text-white";
    
    return (
        <button
            onClick={onClick}
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
        >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
        </button>
    );
};

export const Header: React.FC<HeaderProps> = ({ currentMode, onModeChange }) => {
  return (
    <header className="bg-slate-800/60 backdrop-blur-lg shadow-md sticky top-0 z-50 p-3">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <LogoIcon className="w-8 h-8 text-indigo-400" />
          <h1 className="text-xl font-bold tracking-wide text-white">Meu Design <span className="text-indigo-400">Útil</span></h1>
        </div>
        <nav className="flex space-x-1 bg-slate-900/50 p-1 rounded-xl">
          <NavButton 
            isActive={currentMode === 'generate'} 
            onClick={() => onModeChange('generate')}
            Icon={GenerateIcon}
            label="Generate"
          />
           <NavButton 
            isActive={currentMode === 'doodle'} 
            onClick={() => onModeChange('doodle')}
            Icon={DoodleIcon}
            label="Doodle"
          />
           <NavButton 
            isActive={currentMode === 'mockup'} 
            onClick={() => onModeChange('mockup')}
            Icon={MockupIcon}
            label="Mockups"
          />
          <NavButton 
            isActive={currentMode === 'vectorize'} 
            onClick={() => onModeChange('vectorize')}
            Icon={VectorizeIcon}
            label="Vectorize"
          />
          <NavButton 
            isActive={currentMode === 'edit'} 
            onClick={() => onModeChange('edit')}
            Icon={EditIcon}
            label="Edit & Enhance"
          />
        </nav>
      </div>
    </header>
  );
};