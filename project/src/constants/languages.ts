import { Language } from '../types';

export const SUPPORTED_LANGUAGES: { [key in Language]: string } = {
  english: 'English',
  hindi: 'हिंदी',
  tamil: 'தமிழ்',
  telugu: 'తెలుగు',
  kannada: 'ಕನ್ನಡ',
  marathi: 'मराठी',
  punjabi: 'ਪੰਜਾਬੀ'
};

export const LANGUAGE_GREETINGS: { [key in Language]: string } = {
  english: 'Hello! I am Hardini, your farming assistant. How can I help you today?',
  hindi: 'नमस्ते! मैं हार्दिनी हूं, आपकी कृषि सहायक। आज मैं आपकी कैसे मदद कर सकती हूं?',
  tamil: 'வணக்கம்! நான் ஹார்டினி, உங்கள் விவசாய உதவியாளர். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?',
  telugu: 'హలో! నేను హార్దిని, మీ వ్యవసాయ సహాయకురాలిని. నేడు నేను మీకు ఎలా సహాయం చేయగలను?',
  kannada: 'ನಮಸ್ಕಾರ! ನಾನು ಹಾರ್ದಿನಿ, ನಿಮ್ಮ ಕೃಷಿ ಸಹಾಯಕ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?',
  marathi: 'नमस्कार! मी हार्दिनी आहे, तुमची शेती सहाय्यक. आज मी तुम्हाला कशी मदत करू शकते?',
  punjabi: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਹਾਰਦੀਨੀ ਹਾਂ, ਤੁਹਾਡੀ ਖੇਤੀਬਾੜੀ ਸਹਾਇਕ। ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ?'
};

export const UI_TRANSLATIONS: { [key in Language]: Record<string, string> } = {
  english: {
    send: 'Send',
    voiceStart: 'Start speaking',
    voiceStop: 'Stop recording',
    uploadImage: 'Upload crop image',
    weather: 'Get weather',
    advice: 'Farming advice',
    news: 'Latest news',
    switchLanguage: 'Change language',
    analyzing: 'Analyzing your crop...',
    errorMessage: 'Sorry, something went wrong. Please try again.'
  },
  hindi: {
    send: 'भेजें',
    voiceStart: 'बोलना शुरू करें',
    voiceStop: 'रिकॉर्डिंग बंद करें',
    uploadImage: 'फसल की छवि अपलोड करें',
    weather: 'मौसम जानें',
    advice: 'कृषि सलाह',
    news: 'ताज़ा खबर',
    switchLanguage: 'भाषा बदलें',
    analyzing: 'आपकी फसल का विश्लेषण किया जा रहा है...',
    errorMessage: 'क्षमा करें, कुछ गलत हो गया। कृपया पुनः प्रयास करें।'
  },
  tamil: {
    send: 'அனுப்பு',
    voiceStart: 'பேச தொடங்கு',
    voiceStop: 'பதிவை நிறுத்து',
    uploadImage: 'பயிர் படத்தை பதிவேற்றுக',
    weather: 'வானிலை பெறுக',
    advice: 'விவசாய ஆலோசனை',
    news: 'சமீபத்திய செய்திகள்',
    switchLanguage: 'மொழியை மாற்று',
    analyzing: 'உங்கள் பயிரை ஆராய்கிறது...',
    errorMessage: 'மன்னிக்கவும், ஏதோ தவறு நடந்துவிட்டது. மீண்டும் முயற்சிக்கவும்.'
  },
  telugu: {
    send: 'పంపు',
    voiceStart: 'మాట్లాడటం ప్రారంభించండి',
    voiceStop: 'రికార్డింగ్ ఆపు',
    uploadImage: 'పంట చిత్రాన్ని అప్లోడ్ చేయండి',
    weather: 'వాతావరణాన్ని పొందండి',
    advice: 'వ్యవసాయ సలహా',
    news: 'తాజా వార్తలు',
    switchLanguage: 'భాష మార్చండి',
    analyzing: 'మీ పంటను విశ్లేషిస్తోంది...',
    errorMessage: 'క్షమించండి, ఏదో తప్పు జరిగింది. దయచేసి మళ్లీ ప్రయత్నించండి.'
  },
  kannada: {
    send: 'ಕಳುಹಿಸು',
    voiceStart: 'ಮಾತನಾಡಲು ಪ್ರಾರಂಭಿಸಿ',
    voiceStop: 'ರೆಕಾರ್ಡಿಂಗ್ ನಿಲ್ಲಿಸಿ',
    uploadImage: 'ಬೆಳೆ ಚಿತ್ರವನ್ನು ಅಪ್ಲೋಡ್ ಮಾಡಿ',
    weather: 'ಹವಾಮಾನ ಪಡೆಯಿರಿ',
    advice: 'ಕೃಷಿ ಸಲಹೆ',
    news: 'ಇತ್ತೀಚಿನ ಸುದ್ದಿ',
    switchLanguage: 'ಭಾಷೆ ಬದಲಾಯಿಸಿ',
    analyzing: 'ನಿಮ್ಮ ಬೆಳೆಯನ್ನು ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...',
    errorMessage: 'ಕ್ಷಮಿಸಿ, ಏನೋ ತಪ್ಪಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.'
  },
  marathi: {
    send: 'पाठवा',
    voiceStart: 'बोलायला सुरुवात करा',
    voiceStop: 'रेकॉर्डिंग थांबवा',
    uploadImage: 'पिकाची प्रतिमा अपलोड करा',
    weather: 'हवामान मिळवा',
    advice: 'शेती सल्ला',
    news: 'ताज्या बातम्या',
    switchLanguage: 'भाषा बदला',
    analyzing: 'तुमच्या पिकाचे विश्लेषण केले जात आहे...',
    errorMessage: 'क्षमस्व, काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा.'
  },
  punjabi: {
    send: 'ਭੇਜੋ',
    voiceStart: 'ਬੋਲਣਾ ਸ਼ੁਰੂ ਕਰੋ',
    voiceStop: 'ਰਿਕਾਰਡਿੰਗ ਬੰਦ ਕਰੋ',
    uploadImage: 'ਫਸਲ ਦੀ ਤਸਵੀਰ ਅਪਲੋਡ ਕਰੋ',
    weather: 'ਮੌਸਮ ਪ੍ਰਾਪਤ ਕਰੋ',
    advice: 'ਖੇਤੀਬਾੜੀ ਸਲਾਹ',
    news: 'ਤਾਜ਼ਾ ਖ਼ਬਰਾਂ',
    switchLanguage: 'ਭਾਸ਼ਾ ਬਦਲੋ',
    analyzing: 'ਤੁਹਾਡੀ ਫਸਲ ਦਾ ਵਿਸ਼ਲੇਸ਼ਣ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ...',
    errorMessage: 'ਮਾਫ਼ ਕਰਨਾ, ਕੁਝ ਗਲਤ ਹੋ ਗਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'
  }
};