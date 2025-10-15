"use client";

import { useState, useRef } from "react";

interface Job {
  job_id: string;
  state: string;
  progress: number;
  message?: string;
}

interface RepoInputProps {
  onAnalysisStart: (job: Job) => void;
}

type InputType = 'local' | 'github' | 'upload';

export default function RepoInput({ onAnalysisStart }: RepoInputProps) {
  const [inputType, setInputType] = useState<InputType>('local');
  const [path, setPath] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValidGitHubUrl = (url: string) => {
    const githubRegex = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?\/?$/;
    return githubRegex.test(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let requestBody: any = {};
    
    if (inputType === 'local') {
      if (!path.trim()) {
        alert("Please enter a repository path");
        return;
      }
      requestBody = { path: path.trim() };
    } else if (inputType === 'github') {
      if (!githubUrl.trim()) {
        alert("Please enter a GitHub URL");
        return;
      }
      if (!isValidGitHubUrl(githubUrl.trim())) {
        alert("Please enter a valid GitHub repository URL (e.g., https://github.com/user/repo)");
        return;
      }
      requestBody = { repo_url: githubUrl.trim() };
    } else {
      alert("File upload is not implemented yet");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const job: Job = await response.json();
      onAnalysisStart(job);
    } catch (error) {
      console.error("Failed to start analysis:", error);
      alert(`Failed to start analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
        // TODO: Handle zip file upload
        alert('Zip file upload will be implemented soon!');
      } else {
        alert('Please upload a .zip file');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
        // TODO: Handle zip file upload
        alert('Zip file upload will be implemented soon!');
      } else {
        alert('Please select a .zip file');
      }
    }
  };

  const isFormValid = () => {
    if (inputType === 'local') return path.trim() !== '';
    if (inputType === 'github') return githubUrl.trim() !== '' && isValidGitHubUrl(githubUrl.trim());
    return false; // Upload not implemented yet
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-foreground mb-6">
          Analyze Repository
        </h2>
        
        {/* Input Type Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-6">
          <button
            type="button"
            onClick={() => setInputType('local')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              inputType === 'local'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            📁 Local Path
          </button>
          <button
            type="button"
            onClick={() => setInputType('github')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              inputType === 'github'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            🐙 GitHub URL
          </button>
          <button
            type="button"
            onClick={() => setInputType('upload')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              inputType === 'upload'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            📦 Upload ZIP
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Local Path Input */}
          {inputType === 'local' && (
            <div>
              <label 
                htmlFor="repo-path" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Repository Path
              </label>
              <input
                id="repo-path"
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/path/to/your/repository"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                disabled={isLoading}
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Enter the full path to a local repository directory
              </p>
            </div>
          )}

          {/* GitHub URL Input */}
          {inputType === 'github' && (
            <div>
              <label 
                htmlFor="github-url" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                GitHub Repository URL
              </label>
              <input
                id="github-url"
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username/repository"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                disabled={isLoading}
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Enter a public GitHub repository URL
              </p>
            </div>
          )}

          {/* File Upload */}
          {inputType === 'upload' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload Repository ZIP
              </label>
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                  dragActive
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isLoading}
                />
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      ZIP files only (coming soon)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading || !isFormValid()}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Starting Analysis...
              </>
            ) : (
              "Analyze Repository"
            )}
          </button>
        </form>
      </div>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          💡 Make sure your FastAPI backend is running on localhost:8000
        </p>
      </div>
    </div>
  );
}