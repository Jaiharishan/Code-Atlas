"use client";

import { useState } from "react";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAskQuestion?: (question: string) => void;
}

export default function SearchBar({ searchQuery, onSearchChange, onAskQuestion }: SearchBarProps) {
  const [isAsking, setIsAsking] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // Check if this looks like a question
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'does', 'is', 'can', 'should'];
    const isQuestion = questionWords.some(word => 
      searchQuery.toLowerCase().includes(word)
    ) || searchQuery.includes('?');
    
    if (isQuestion && onAskQuestion) {
      setIsAsking(true);
      try {
        await onAskQuestion(searchQuery);
      } finally {
        setIsAsking(false);
      }
    }
  };

  return (
    <div className="max-w-md">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg 
              className="h-5 w-5 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files or ask 'What does X do?'..."
            className="w-full pl-10 pr-20 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            disabled={isAsking}
          />
          <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
            {searchQuery && (
              <button
                type="submit"
                disabled={isAsking}
                className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                title="Ask AI"
              >
                {isAsking ? (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </button>
            )}
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                title="Clear"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </form>
      
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Try: "What does main.py do?" or "How does authentication work?"
      </div>
    </div>
  );
}
