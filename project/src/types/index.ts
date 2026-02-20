export type Language = 'english' | 'hindi' | 'tamil' | 'telugu' | 'kannada' | 'marathi' | 'punjabi';

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  language?: Language;
}

export interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  rainfall: number;
  forecast: string;
}

export interface CropAdvice {
  cropName: string;
  seasonalTips: string;
  pestControl: string;
  irrigation: string;
  fertilizer: string;
}

export type ChatbotFunction = 
  | 'weather'
  | 'cropAdvice'
  | 'pestIdentification'
  | 'marketPrices'
  | 'governmentSchemes'
  | 'general';