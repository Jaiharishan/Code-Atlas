"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

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
  const [chatHeight, setChatHeight] = useState<number>(420);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragLastYRef = useRef<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-size the textarea based on content
  useEffect(() => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    el.style.height = "0px";
    const next = Math.min(el.scrollHeight, 160); // cap at ~10 lines
    el.style.height = next + "px";
  }, [inputValue]);

  // Drag to resize (Y-axis)
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (dragLastYRef.current === null) {
        dragLastYRef.current = e.clientY;
        return;
      }
      const deltaY = e.clientY - dragLastYRef.current;
      dragLastYRef.current = e.clientY;
      // Handle at the top edge: moving mouse down should decrease height
      setChatHeight((prev) => {
        const next = prev - deltaY;
        return Math.min(Math.max(next, 240), 800);
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragLastYRef.current = null;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ns-resize";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging]);

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
    } catch {
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
    <div
      className={
        isFullscreen
          ? "chat-container fixed inset-0 z-50 bg-gh-canvas"
          : "chat-container"
      }
      style={{ height: isFullscreen ? "100vh" : chatHeight + "px" }}
    >
      <div className="flex flex-col h-full">
        {/* Resize handle (only when expanded and not fullscreen) */}
        {!isFullscreen && (
          <div
            className="h-2 w-full cursor-ns-resize border-b border-gh-border bg-gh-canvas-subtle flex items-center justify-center"
            onMouseDown={() => setIsDragging(true)}
            title="Drag to resize"
          >
            <div className="h-1 w-12 rounded bg-gh-border" />
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gh-border bg-gh-canvas-subtle">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gh-text">💬 Ask about your repository</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen((v) => !v)}
              className="text-gh-text-secondary hover:text-gh-text transition-colors"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                // minimize icon
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h6M8 4v6M20 16h-6M16 20v-6" />
                </svg>
              ) : (
                // maximize icon
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h6M8 4v6M20 16h-6M16 20v-6" transform="rotate(180 12 12)" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gh-text-secondary hover:text-gh-text transition-colors"
              aria-label="Close chat"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gh-text-tertiary">
              <div className="text-center">
                <div className="text-2xl mb-2">🤖</div>
                <p className="text-sm">Ask me anything about this repository!</p>
                <p className="text-xs mt-1">Try: &quot;What does this project do?&quot; or &quot;How is the code organized?&quot;</p>
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
                            code(props) {
                              const {inline, className, children} = props as {
                                inline?: boolean;
                                className?: string;
                                children?: React.ReactNode;
                              };
                              const match = /language-(\\w+)/.exec(className || '');
                              return !inline && match ? (
                                <SyntaxHighlighter
                                  language={match[1]}
                                  PreTag="div"
                                  className="bg-gray-900 text-gray-100 p-3 rounded text-sm"
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
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={jobId ? "Ask about this repository..." : "Complete analysis to start asking questions"}
                    disabled={isLoading || !jobId}
                    rows={1}
                    className="chat-input resize-none pr-10 max-h-40"
                    style={{ minHeight: '40px' }}
                  />
                  {/* trailing adornment */}
                  <div className="pointer-events-none absolute right-2 bottom-2 text-gh-text-tertiary">
                    <span className="text-[10px] hidden sm:inline">Enter ↵</span>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading || !jobId}
                className="gh-btn gh-btn-primary h-10 w-10 grid place-items-center disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
                title="Send"
              >
                <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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