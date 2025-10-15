"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface BottomChatProps {
  jobId?: string;
  onAskQuestion: (question: string) => Promise<string>;
}

export default function BottomChat({ jobId, onAskQuestion }: BottomChatProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !jobId) return;

    const question = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: question,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await onAskQuestion(question);
      
      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I'm sorry, I encountered an error while processing your question. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  if (!isExpanded) {
    return (
      <div className="chat-container h-14">
        <div className="flex items-center px-4 h-full">
          <div className="flex-1">
            <button
              onClick={handleExpand}
              disabled={!jobId}
              className="w-full text-left px-4 py-2 bg-gh-canvas-subtle border border-gh-border rounded-md text-gh-text-tertiary hover:text-gh-text hover:border-gh-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {jobId ? "Ask a question about this repository..." : "Complete analysis to start asking questions"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container" style={{ height: '400px' }}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gh-border bg-gh-canvas-subtle">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gh-text">💬 Ask about your repository</span>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gh-text-secondary hover:text-gh-text transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gh-text-tertiary">
              <div className="text-center">
                <div className="text-2xl mb-2">🤖</div>
                <p className="text-sm">Ask me anything about this repository!</p>
                <p className="text-xs mt-1">Try: "What does this project do?" or "How is the code organized?"</p>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-gh-accent text-white'
                        : 'bg-gh-canvas-subtle text-gh-text border border-gh-border'
                    }`}
                  >
                    {message.type === 'assistant' ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            code({node, inline, className, children, ...props}) {
                              const match = /language-(\\w+)/.exec(className || '');
                              return !inline && match ? (
                                <SyntaxHighlighter
                                  style={oneDark}
                                  language={match[1]}
                                  PreTag="div"
                                  {...props}
                                >
                                  {String(children).replace(/\\n$/, '')}
                                </SyntaxHighlighter>
                              ) : (
                                <code className="bg-gh-canvas-inset px-1 py-0.5 rounded text-sm" {...props}>
                                  {children}
                                </code>
                              );
                            },
                            p: ({children}) => <p className="mb-2 last:mb-0 text-sm leading-relaxed">{children}</p>,
                            ul: ({children}) => <ul className="list-disc list-inside mb-2 text-sm space-y-1">{children}</ul>,
                            ol: ({children}) => <ol className="list-decimal list-inside mb-2 text-sm space-y-1">{children}</ol>,
                            h1: ({children}) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                            h2: ({children}) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                            h3: ({children}) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                            blockquote: ({children}) => (
                              <blockquote className="border-l-2 border-gh-border-muted pl-2 italic text-gh-text-secondary mb-2">
                                {children}
                              </blockquote>
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                    <div className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-blue-100' : 'text-gh-text-tertiary'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gh-canvas-subtle text-gh-text border border-gh-border rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gh-text-tertiary rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gh-text-tertiary rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gh-text-tertiary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-sm text-gh-text-secondary">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gh-border bg-gh-canvas">
          <form onSubmit={handleSubmit} className="p-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about this repository..."
                  disabled={isLoading || !jobId}
                  rows={1}
                  className="chat-input resize-none max-h-32"
                  style={{ minHeight: '40px' }}
                />
              </div>
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading || !jobId}
                className="gh-btn gh-btn-primary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gh-text-tertiary">
                Press Enter to send, Shift+Enter for new line
              </p>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  className="text-xs text-gh-text-secondary hover:text-gh-danger-emphasis transition-colors"
                >
                  Clear chat
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}