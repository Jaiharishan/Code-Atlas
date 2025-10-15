"use client";

import { useState } from "react";
import TreeNode from "./TreeNode";
import SearchBar from "./SearchBar";
import DependencyGraph from "./DependencyGraph";

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
  const [qaAnswer, setQaAnswer] = useState<string | null>(null);
  const [qaQuestion, setQaQuestion] = useState<string>("");

  const handleAskQuestion = async (question: string) => {
    try {
      setQaQuestion(question);
      setQaAnswer(null);
      
      const response = await fetch(`http://localhost:8000/repos/${jobId}/search?q=${encodeURIComponent(question)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setQaAnswer(result.answer || "I couldn't find a specific answer to that question.");
    } catch (error) {
      console.error("Failed to get answer:", error);
      setQaAnswer("Sorry, I encountered an error while trying to answer your question.");
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Repository Analysis</h2>
          <p className="text-gray-600 dark:text-gray-400">{tree.path}</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={downloadJSON}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Download JSON
          </button>
          <button
            onClick={onReset}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Analyze New Repository
          </button>
        </div>
      </div>

      {/* Search */}
      <SearchBar 
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery}
        onAskQuestion={handleAskQuestion}
      />
      
      {/* Q&A Answer */}
      {qaAnswer && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-blue-800 dark:text-blue-200 font-medium mb-2">
            🤖 AI Answer: "{qaQuestion}"
          </h3>
          <p className="text-blue-700 dark:text-blue-300">{qaAnswer}</p>
          <button
            onClick={() => {setQaAnswer(null); setQaQuestion("");}}
            className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('tree')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tree'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            📁 Repository Tree
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'graph'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            🕸️ Dependency Graph
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tree/Graph View */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 rounded-lg">
            <div className="p-4">
              {activeTab === 'tree' ? (
                <div className="max-h-[600px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
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
              ) : (
                <DependencyGraph jobId={jobId} />
              )}
            </div>
          </div>
        </div>

        {/* Details Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 rounded-lg sticky top-4">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-foreground flex items-center">
                <span className="mr-2">📋</span>
                Details
              </h3>
            </div>
            <div className="p-4 max-h-[500px] overflow-y-auto">
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
