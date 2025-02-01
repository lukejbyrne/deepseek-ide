import React, { useState } from 'react';
import { Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface OpenFile {
  id: string;
  path: string;
  content: string;
  language: string;
  isDirty: boolean;
}

interface AIChatProps {
  files: OpenFile[]; // Now receives all open files
}

const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate';

const AIChat: React.FC<AIChatProps> = ({ files }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Format all open files into a structured context
  const formatContext = () => {
    return files.map(file => `### File: ${file.path}\n${file.content}`).join('\n\n');
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(OLLAMA_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5-coder:3b',
          prompt: `You are an AI assistant helping a developer. Be concise and use the following context to help the user:\n\n${formatContext()}\n\nUser: ${input}\nAssistant:`,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to connect to Ollama API');
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      let assistantMessage = { role: 'assistant' as const, content: '' };
      setMessages(prev => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        try {
          const json = JSON.parse(chunk);
          if (json.response.trim()) {
            assistantMessage.content += json.response;
            setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }]);
          }
        } catch (error) {
          console.error("Error parsing JSON:", error, "Chunk:", chunk);
        }
      }

      console.log(assistantMessage.content)
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Error: Failed to connect to Ollama. Make sure it\'s running locally.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-800">
      {/* Header */}
      <div className="p-2 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-300">AI Assistant</h2>
      </div>
  
      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 max-h-[60vh]">
        {messages.map((message, index) => (
          <div key={index} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block p-2 rounded-lg max-w-[85%] ${
              message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'
            }`}>
              {/* Use ReactMarkdown instead of <pre> */}
              <ReactMarkdown className="whitespace-pre-wrap font-sans text-sm">
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
  
      {/* Input Box */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            disabled={isLoading}
            className="flex-1 bg-gray-700 text-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            placeholder={isLoading ? 'Waiting for response...' : 'Ask anything...'}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading}
            className="ml-2 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
  
};

export default AIChat;
