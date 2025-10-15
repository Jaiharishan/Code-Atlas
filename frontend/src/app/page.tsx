"use client";

import RepoAnalyzer from "./components/RepoAnalyzer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gh-canvas">
      <header className="border-b border-gh-border bg-gh-canvas">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🗺️</div>
            <div>
              <h1 className="text-2xl font-bold text-gh-text">Code Atlas</h1>
              <p className="text-gh-text-secondary mt-0.5">
                Analyze repository structure with local AI
              </p>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <RepoAnalyzer />
      </main>
    </div>
  );
}
