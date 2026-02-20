import React from 'react';
import { Cloud, Scaling as Seedling, FileText } from 'lucide-react';
import { Language } from '../types';
import { UI_TRANSLATIONS } from '../constants/languages';

interface QuickActionsProps {
  onAction: (action: string) => void;
  currentLanguage: Language;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onAction, currentLanguage }) => {
  const translations = UI_TRANSLATIONS[currentLanguage];

  return (
    <div className="px-4 py-3 bg-green-50 border-t border-green-100">
      <h3 className="text-sm font-medium text-green-800 mb-2">
        {currentLanguage === 'english' ? 'Quick Actions' : 'त्वरित कार्य'}
      </h3>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onAction('weather')}
          className="flex items-center px-3 py-2 bg-white rounded-lg border border-green-200 text-sm text-green-700 hover:bg-green-100 transition-colors"
        >
          <Cloud className="h-4 w-4 mr-2" />
          {translations.weather}
        </button>
        <button
          onClick={() => onAction('advice')}
          className="flex items-center px-3 py-2 bg-white rounded-lg border border-green-200 text-sm text-green-700 hover:bg-green-100 transition-colors"
        >
          <Seedling className="h-4 w-4 mr-2" />
          {translations.advice}
        </button>
        <button
          onClick={() => onAction('news')}
          className="flex items-center px-3 py-2 bg-white rounded-lg border border-green-200 text-sm text-green-700 hover:bg-green-100 transition-colors"
        >
          <FileText className="h-4 w-4 mr-2" />
          {translations.news}
        </button>
      </div>
    </div>
  );
};

export default QuickActions;