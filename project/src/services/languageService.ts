import { Language } from '../types';

// In a real implementation, this would use a language detection API
// For demo purposes, we'll just simulate detection based on input text patterns
export const detectLanguage = (text: string): Language => {
  // Very simplified language detection based on character patterns
  // In a real app, use a proper language detection library or API
  
  // Hindi characters range: \u0900-\u097F
  if (/[\u0900-\u097F]/.test(text)) return 'hindi';
  
  // Tamil characters range: \u0B80-\u0BFF
  if (/[\u0B80-\u0BFF]/.test(text)) return 'tamil';
  
  // Telugu characters range: \u0C00-\u0C7F
  if (/[\u0C00-\u0C7F]/.test(text)) return 'telugu';
  
  // Kannada characters range: \u0C80-\u0CFF
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kannada';
  
  // Marathi uses Devanagari script like Hindi, but this is just for simulation
  if (text.includes('मराठी')) return 'marathi';
  
  // Punjabi characters range: \u0A00-\u0A7F
  if (/[\u0A00-\u0A7F]/.test(text)) return 'punjabi';
  
  // Default to English
  return 'english';
};

// Simulate speech recognition
export const startVoiceRecognition = (
  onResult: (text: string, language: Language) => void,
  onError: (error: Error) => void
): (() => void) => {
  // Check if browser supports speech recognition
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    onError(new Error('Speech recognition not supported in this browser'));
    return () => {};
  }

  // This is a mock implementation
  // In a real app, use the actual Web Speech API
  const mockPhrases = [
    { text: 'What is the weather forecast for tomorrow?', language: 'english' },
    { text: 'कल के लिए मौसम का पूर्वानुमान क्या है?', language: 'hindi' },
    { text: 'நாளைய வானிலை முன்னறிவிப்பு என்ன?', language: 'tamil' },
    { text: 'రేపటి వాతావరణ సూచన ఏమిటి?', language: 'telugu' }
  ];

  // Simulate recording delay
  const timeout = setTimeout(() => {
    const randomPhrase = mockPhrases[Math.floor(Math.random() * mockPhrases.length)];
    onResult(randomPhrase.text, randomPhrase.language as Language);
  }, 3000);

  // Return stop function
  return () => clearTimeout(timeout);
};