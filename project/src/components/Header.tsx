import React from 'react';
import { Sun, Cloud, CloudRain, Droplets, Wind } from 'lucide-react';
import { Language } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants/languages';

interface HeaderProps {
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
}

const Header: React.FC<HeaderProps> = ({ currentLanguage, onLanguageChange }) => {
  return (
    <header className="bg-gradient-to-r from-green-700 to-green-900 text-white py-4 px-4 shadow-md">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center mb-3 md:mb-0">
          <div className="bg-green-600 p-2 rounded-full mr-3">
            <CloudRain className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Hardini</h1>
        </div>
        
        <div className="flex flex-wrap justify-center space-x-2">
          <div className="flex items-center space-x-1 bg-green-600/50 px-3 py-1 rounded-full text-sm">
            <Sun className="h-4 w-4" />
            <span>28°C</span>
          </div>
          <div className="flex items-center space-x-1 bg-green-600/50 px-3 py-1 rounded-full text-sm">
            <Droplets className="h-4 w-4" />
            <span>65%</span>
          </div>
          <div className="flex items-center space-x-1 bg-green-600/50 px-3 py-1 rounded-full text-sm">
            <Wind className="h-4 w-4" />
            <span>12km/h</span>
          </div>
          <div className="flex items-center space-x-1 bg-green-600/50 px-3 py-1 rounded-full text-sm">
            <Cloud className="h-4 w-4" />
            <span>Partly Cloudy</span>
          </div>
        </div>
        
        <div className="mt-3 md:mt-0">
          <select 
            value={currentLanguage}
            onChange={(e) => onLanguageChange(e.target.value as Language)}
            className="bg-green-600 text-white rounded-md px-3 py-1 border-none focus:ring-2 focus:ring-green-400 text-sm md:text-base"
          >
            {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};

export default Header;