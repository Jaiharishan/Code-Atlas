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
                <div className="max-h-96 overflow-y-auto">
                  <TreeNode
                    node={tree}
                    level={0}
                    isExpanded={expandedNodes.has(tree.path)}
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
          <div className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 rounded-lg">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-foreground">Details</h3>
            </div>
            <div className="p-4">
              {selectedNode ? (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-foreground">{selectedNode.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 break-all">
                      {selectedNode.path}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Type:</span>
                      <p className="text-gray-600 dark:text-gray-400 capitalize">{selectedNode.type}</p>
                    </div>
                    {selectedNode.language && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Language:</span>
                        <p className="text-gray-600 dark:text-gray-400">{selectedNode.language}</p>
                      </div>
                    )}
                    {selectedNode.size && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Size:</span>
                        <p className="text-gray-600 dark:text-gray-400">
                          {(selectedNode.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedNode.summary && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300 block mb-2">
                        Summary:
                      </span>
                      <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        {selectedNode.summary}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Select a file or directory to view details
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}