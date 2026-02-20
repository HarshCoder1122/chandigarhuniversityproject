import React from 'react';
import { X } from 'lucide-react';
import { Language } from '../types';
import { UI_TRANSLATIONS } from '../constants/languages';

interface ImagePreviewProps {
  imageUrl: string;
  onClose: () => void;
  isAnalyzing: boolean;
  currentLanguage: Language;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ 
  imageUrl, 
  onClose, 
  isAnalyzing,
  currentLanguage 
}) => {
  const translations = UI_TRANSLATIONS[currentLanguage];
  
  return (
    <div className="relative bg-black bg-opacity-5 p-4 rounded-lg">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70 transition-opacity z-10"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      
      <div className="relative">
        <img 
          src={imageUrl} 
          alt="Uploaded crop" 
          className="w-full h-48 object-cover rounded-lg"
        />
        
        {isAnalyzing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-white font-medium">{translations.analyzing}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImagePreview;