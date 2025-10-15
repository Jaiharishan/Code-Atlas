"use client";

import { useState } from "react";
import RepoAnalyzer from "./components/RepoAnalyzer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-foreground">Code Atlas</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Analyze repository structure and generate intelligent summaries
          </p>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RepoAnalyzer />
      </main>
    </div>
  );
}
