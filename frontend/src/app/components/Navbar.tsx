"use client";

import { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-gh-border bg-gh-canvas/80 backdrop-blur supports-[backdrop-filter]:bg-gh-canvas/60 sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          {/* Brand */}
          <a href="/" className="flex items-center gap-3">
            <span className="text-2xl">🗺️</span>
            <div className="leading-tight">
              <span className="block text-lg font-semibold text-gh-text">Code Atlas</span>
              <span className="block text-sm text-gh-text-secondary">Analyze repositories with local AI</span>
            </div>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#analyze" className="text-gh-text-secondary hover:text-gh-text transition">Analyze</a>
            <a href="#explore" className="text-gh-text-secondary hover:text-gh-text transition">Explore</a>
            <a href="#search" className="text-gh-text-secondary hover:text-gh-text transition">Search</a>
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              className="text-gh-text-secondary hover:text-gh-text transition"
            >
              GitHub
            </a>
            <button
              type="button"
              className="rounded-md border border-gh-border px-3 py-1.5 text-sm text-gh-text hover:bg-gh-subtle transition"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              New Analysis
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            aria-label="Toggle menu"
            className="md:hidden inline-flex items-center justify-center rounded-md border border-gh-border p-2 text-gh-text hover:bg-gh-subtle"
            onClick={() => setOpen(!open)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
            >
              {open ? (
                <path fillRule="evenodd" d="M6.225 4.811a1 1 0 0 1 1.414 0L12 9.172l4.361-4.361a1 1 0 1 1 1.414 1.414L13.414 10.586l4.361 4.361a1 1 0 0 1-1.414 1.414L12 12l-4.361 4.361a1 1 0 1 1-1.414-1.414l4.361-4.361-4.361-4.361a1 1 0 0 1 0-1.414Z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M3.75 5.25A.75.75 0 0 1 4.5 4.5h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Zm0 7.5a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Zm0 7.5a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden mt-3 border-t border-gh-border pt-3 space-y-2">
            <a href="#analyze" className="block text-gh-text-secondary hover:text-gh-text">Analyze</a>
            <a href="#explore" className="block text-gh-text-secondary hover:text-gh-text">Explore</a>
            <a href="#search" className="block text-gh-text-secondary hover:text-gh-text">Search</a>
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              className="block text-gh-text-secondary hover:text-gh-text"
            >
              GitHub
            </a>
            <button
              type="button"
              className="w-full rounded-md border border-gh-border px-3 py-2 text-sm text-gh-text hover:bg-gh-subtle"
              onClick={() => {
                setOpen(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              New Analysis
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}


