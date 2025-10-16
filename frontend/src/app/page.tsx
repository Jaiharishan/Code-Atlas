"use client";

import RepoAnalyzer from "./components/RepoAnalyzer";
import Navbar from "./components/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-gh-canvas">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <RepoAnalyzer />
      </main>
    </div>
  );
}
