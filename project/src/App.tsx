import React from 'react';
import { ChatProvider } from './contexts/ChatContext';
import ChatInterface from './components/ChatInterface';

function App() {
  return (
    <ChatProvider>
      <div className="min-h-screen bg-green-50">
        <ChatInterface />
      </div>
    </ChatProvider>
  );
}

export default App;