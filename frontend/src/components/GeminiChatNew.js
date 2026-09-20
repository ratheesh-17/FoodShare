import React, { useState, useRef, useEffect } from 'react';
import { Button, Spinner, Alert } from './UI';
import { useMutate } from '../hooks';

const GeminiChatNew = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! How can I help you today?' }
  ]);
  const [userInput, setUserInput] = useState('');
  const messagesEndRef = useRef(null);
  const { mutate, loading, error } = useMutate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    // Add user message
    const newMessages = [...messages, { role: 'user', text: userInput }];
    setMessages(newMessages);
    setUserInput('');

    try {
      // Call backend proxy instead of exposing API key
      const response = await mutate('POST', '/ai/chat', {
        message: userInput,
      });

      setMessages([...newMessages, { role: 'assistant', text: response.response }]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages([...newMessages, {
        role: 'assistant',
        text: '❌ Sorry, I encountered an error. Please try again.',
        isError: true
      }]);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center text-2xl z-40"
        aria-label="Open chat"
        title="FoodShare Assistant"
      >
        💬
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-96 bg-white rounded-lg shadow-2xl flex flex-col z-40 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">FoodShare Assistant</h3>
          <p className="text-sm text-primary-100">Powered by AI</p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:opacity-70 transition-opacity text-2xl"
          aria-label="Close chat"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-br-none'
                  : msg.isError
                  ? 'bg-red-100 text-red-800 rounded-bl-none'
                  : 'bg-white border border-primary-200 text-gray-900 rounded-bl-none'
              }`}
            >
              <p className="text-sm">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-primary-200 px-4 py-3 rounded-lg rounded-bl-none">
              <Spinner size="sm" color="primary" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4 bg-white rounded-b-lg">
        {error && (
          <Alert variant="error" className="mb-3 text-xs">
            {error}
          </Alert>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask me anything..."
            className="input-base flex-1 text-sm"
            disabled={loading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={loading || !userInput.trim()}
            loading={loading}
            size="sm"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GeminiChatNew;
