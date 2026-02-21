import React from 'react';
import { ChatProvider } from './contexts/ChatContext';
import ChatInterface from './components/ChatInterface';
import VoiceAgent from './components/VoiceAgent';

function App() {
  return (
    <ChatProvider>
      <div className="min-h-screen bg-green-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <VoiceAgent />
          <ChatInterface />
        </div>
      </div>
    </ChatProvider>
  );
}

export default App;