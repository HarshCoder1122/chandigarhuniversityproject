import { v4 as uuidv4 } from 'uuid';
import { Message, Language, ChatbotFunction } from '../types';
import { LANGUAGE_GREETINGS } from '../constants/languages';

export const createNewMessage = (
  content: string, 
  sender: 'user' | 'bot', 
  language?: Language
): Message => {
  return {
    id: uuidv4(),
    content,
    sender,
    timestamp: new Date(),
    language
  };
};

export const getWelcomeMessage = (language: Language): Message => {
  return createNewMessage(LANGUAGE_GREETINGS[language], 'bot', language);
};

export const determineFunction = (message: string): ChatbotFunction => {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('weather') || 
      lowerMessage.includes('forecast') || 
      lowerMessage.includes('rain') || 
      lowerMessage.includes('temperature') ||
      lowerMessage.includes('मौसम') ||
      lowerMessage.includes('வானிலை')) {
    return 'weather';
  }
  
  if (lowerMessage.includes('pest') || 
      lowerMessage.includes('disease') || 
      lowerMessage.includes('insect') ||
      lowerMessage.includes('कीट') ||
      lowerMessage.includes('பூச்சி')) {
    return 'pestIdentification';
  }
  
  if (lowerMessage.includes('crop') || 
      lowerMessage.includes('plant') || 
      lowerMessage.includes('grow') || 
      lowerMessage.includes('farm') ||
      lowerMessage.includes('फसल') ||
      lowerMessage.includes('பயிர்')) {
    return 'cropAdvice';
  }
  
  if (lowerMessage.includes('price') || 
      lowerMessage.includes('market') || 
      lowerMessage.includes('sell') ||
      lowerMessage.includes('बाजार') ||
      lowerMessage.includes('சந்தை')) {
    return 'marketPrices';
  }
  
  if (lowerMessage.includes('scheme') || 
      lowerMessage.includes('government') || 
      lowerMessage.includes('subsidy') ||
      lowerMessage.includes('योजना') ||
      lowerMessage.includes('திட்டம்')) {
    return 'governmentSchemes';
  }
  
  return 'general';
};