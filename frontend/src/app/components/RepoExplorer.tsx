"use client";

import { useState } from "react";
import TreeNode from "./TreeNode";
import SearchBar from "./SearchBar";
import DependencyGraph from "./DependencyGraph";
import BottomChat from "./BottomChat";

interface RepoTree {
  path: string;
  name: string;
  type: string;
  language?: string;
  size?: number;
  summary?: string;
  children?: RepoTree[];
}

interface RepoExplorerProps {
  tree: RepoTree;
  jobId: string;
  onReset: () => void;
}

type Tab = 'tree' | 'graph';

export default function RepoExplorer({ tree, jobId, onReset }: RepoExplorerProps) {
  const [selectedNode, setSelectedNode] = useState<RepoTree | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([tree.path]));
  const [activeTab, setActiveTab] = useState<Tab>('tree');

  const handleAskQuestion = async (question: string): Promise<string> => {
    try {
      const response = await fetch(`http://localhost:8000/repos/${jobId}/search?q=${encodeURIComponent(question)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.answer || "I couldn't find a specific answer to that question.";
    } catch (error) {
      console.error("Failed to get answer:", error);
      throw new Error("Sorry, I encountered an error while trying to answer your question.");
    }
  };

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedNodes(newExpanded);
  };

  const downloadJSON = () => {
    const dataStr = JSON.stringify(tree, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${tree.name}_analysis.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="pb-20"> {/* Add padding for bottom chat */}
      {/* Header */}
      <div className="gh-card mb-6">
        <div className="gh-card-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📁</span>
              <div>
                <h2 className="text-lg font-semibold text-gh-text">Repository Analysis</h2>
                <p className="text-sm text-gh-text-secondary font-mono">{tree.name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={downloadJSON}
                className="gh-btn gh-btn-sm text-gh-success-emphasis border-gh-success-emphasis hover:bg-green-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export JSON
              </button>
              <button
                onClick={onReset}
                className="gh-btn gh-btn-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                New Analysis
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchBar 
          searchQuery={searchQuery} 
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gh-border mb-6">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('tree')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'tree'
                ? 'border-gh-accent text-gh-accent'
                : 'border-transparent text-gh-text-secondary hover:text-gh-text hover:border-gh-border-muted'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v4H8V5z" />
              </svg>
              Files
            </span>
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'graph'
                ? 'border-gh-accent text-gh-accent'
                : 'border-transparent text-gh-text-secondary hover:text-gh-text hover:border-gh-border-muted'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
              Dependencies
            </span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tree/Graph View */}
        <div className="lg:col-span-2">
          <div className="gh-card">
            {activeTab === 'tree' ? (
              <div className="gh-card-body">
                <div className="max-h-[600px] overflow-y-auto">
                  <TreeNode
                    node={tree}
                    level={0}
                    expandedNodes={expandedNodes}
                    onToggleExpanded={toggleExpanded}
                    onNodeSelect={setSelectedNode}
                    selectedNode={selectedNode}
                    searchQuery={searchQuery}
                  />
                </div>
              </div>
            ) : (
              <div className="gh-card-body">
                <DependencyGraph jobId={jobId} />
              </div>
            )}
          </div>
        </div>

        {/* Details Panel */}
        <div className="lg:col-span-1">
          <div className="gh-card sticky top-4">
            <div className="gh-card-header">
              <h3 className="text-base font-semibold text-gh-text flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                File Details
              </h3>
            </div>
            <div className="gh-card-body max-h-[500px] overflow-y-auto">
              {selectedNode ? (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xl">
                        {selectedNode.type === 'directory' ? (selectedNode.children?.length ? '📂' : '📁') : getFileIconForDetails(selectedNode)}
                      </span>
                      <h4 className="font-semibold text-foreground">{selectedNode.name}</h4>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all bg-gray-100 dark:bg-gray-800 p-2 rounded">
                      {selectedNode.path}
                    </p>
                  </div>
                  
                  {/* Metadata */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          selectedNode.type === 'directory' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {selectedNode.type === 'directory' ? '📁 Directory' : '📄 File'}
                        </span>
                      </div>
                      
                      {selectedNode.language && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Language:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getLanguageBadgeColor(selectedNode.language)}`}>
                            {selectedNode.language.toUpperCase()}
                          </span>
                        </div>
                      )}
                      
                      {selectedNode.size !== undefined && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Size:</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {formatFileSize(selectedNode.size)}
                          </span>
                        </div>
                      )}
                      
                      {selectedNode.type === 'directory' && selectedNode.children && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Items:</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {selectedNode.children.length} items
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  {selectedNode.summary && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                        📝 Summary:
                      </span>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {selectedNode.summary}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Children preview for directories */}
                  {selectedNode.type === 'directory' && selectedNode.children && selectedNode.children.length > 0 && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                        🗂️ Contains:
                      </span>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {selectedNode.children.slice(0, 10).map((child) => (
                          <div key={child.path} className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                            <span>{child.type === 'directory' ? '📁' : getFileIconForDetails(child)}</span>
                            <span className="truncate">{child.name}</span>
                            {child.language && (
                              <span className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                                {child.language}
                              </span>
                            )}
                          </div>
                        ))}
                        {selectedNode.children.length > 10 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                            ... and {selectedNode.children.length - 10} more items
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📁</div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Select a file or directory to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Chat */}
      <BottomChat jobId={jobId} onAskQuestion={handleAskQuestion} />
    </div>
  );
}

// Helper functions
function getFileIconForDetails(node: RepoTree): string {
  if (node.type === 'directory') return '📁';
  
  const extension = node.name.split('.').pop()?.toLowerCase();
  
  switch (node.language) {
    case "javascript":
      return "🟨";
    case "typescript":
    case "tsx":
      return "🔷";
    case "python":
      return "🐍";
    case "java":
      return "☕";
    case "go":
      return "🐹";
    case "rust":
      return "🦀";
    case "html":
      return "🌐";
    case "css":
      return "🎨";
    case "json":
      return "📋";
    case "markdown":
      return "📝";
    case "yaml":
    case "yml":
      return "⚙️";
    default:
      switch (extension) {
        case "md":
          return "📝";
        case "json":
          return "📋";
        case "yml":
        case "yaml":
          return "⚙️";
        case "txt":
          return "📄";
        case "pdf":
          return "📕";
        case "png":
        case "jpg":
        case "jpeg":
        case "gif":
        case "svg":
          return "🖼️";
        case "zip":
        case "tar":
        case "gz":
          return "📦";
        case "env":
          return "🔐";
        case "gitignore":
          return "🚫";
        case "lock":
          return "🔒";
        case "config":
        case "conf":
          return "⚙️";
        default:
          return "📄";
      }
  }
}

function getLanguageBadgeColor(language: string): string {
  const colors: { [key: string]: string } = {
    typescript: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    javascript: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    python: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    java: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    go: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
    rust: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    html: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    css: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    json: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    yaml: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    tsx: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  };
  
  return colors[language.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
