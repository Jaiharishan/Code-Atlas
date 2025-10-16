"use client";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function SearchBar({ searchQuery, onSearchChange }: SearchBarProps) {
  return (
    <div className="max-w-md">
      <div className="relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 pl-3 pointer-events-none">
          <svg 
            className="h-4 w-4 text-gh-text-tertiary"
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
          placeholder="Search files and folders..."
          className="gh-input pl-10 pr-10 py-2"
        />
        {searchQuery && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 pr-3">
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="text-gh-text-tertiary hover:text-gh-text transition-colors"
              title="Clear search"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
      
      <div className="mt-2 text-xs text-gh-text-tertiary">
        Search by filename, extension, or content
      </div>
    </div>
  );
}
