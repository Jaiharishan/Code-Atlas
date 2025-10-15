"use client";

import { useState } from "react";

interface RepoTree {
  path: string;
  name: string;
  type: string;
  language?: string;
  size?: number;
  summary?: string;
  children?: RepoTree[];
}

interface TreeNodeProps {
  node: RepoTree;
  level: number;
  expandedNodes: Set<string>;
  onToggleExpanded: (path: string) => void;
  onNodeSelect: (node: RepoTree) => void;
  selectedNode: RepoTree | null;
  searchQuery: string;
}

export default function TreeNode({
  node,
  level,
  expandedNodes,
  onToggleExpanded,
  onNodeSelect,
  selectedNode,
  searchQuery
}: TreeNodeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  const isDirectory = node.type === "directory";
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNode?.path === node.path;
  const isExpanded = expandedNodes.has(node.path);
  
  // Filter children based on search query
  const filteredChildren = node.children?.filter(child => 
    searchQuery === "" || 
    child.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    child.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (child.children && hasMatchingDescendant(child, searchQuery))
  );

  // Highlight search terms
  const highlightMatch = (text: string) => {
    if (!searchQuery) return text;
    
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </span>
      ) : part
    );
  };

  const getFileIcon = () => {
    if (isDirectory) {
      return isExpanded ? "📂" : "📁";
    }
    
    // Enhanced icon mapping with more file types
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
        // Fallback to extension-based icons
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
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (node.summary) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipPosition({ x: rect.right + 10, y: rect.top });
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const paddingLeft = level * 20;

  return (
    <div className="relative">
      <div
        className={`group flex items-center cursor-pointer transition-all duration-200 ${
          isSelected 
            ? "bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 shadow-sm" 
            : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
        } ${level > 0 ? "ml-1 border-l border-gray-200 dark:border-gray-700" : ""}`}
        style={{ paddingLeft: `${paddingLeft + 8}px` }}
        onClick={() => onNodeSelect(node)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Connection line for hierarchy */}
        {level > 0 && (
          <div className="absolute -left-px top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
        )}
        
        {/* Expand/collapse button */}
        {isDirectory && hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded(node.path);
            }}
            className="mr-2 p-1 rounded transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <svg 
              className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        
        {/* Spacer for non-expandable items */}
        {(!isDirectory || !hasChildren) && (
          <span className="mr-2 w-5 flex justify-center">
            <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          </span>
        )}
        
        {/* File/folder icon */}
        <span className="mr-3 text-base flex-shrink-0">{getFileIcon()}</span>
        
        <div className="flex-1 min-w-0 py-2">
          <div className="flex items-center space-x-2 mb-1">
            <span className={`font-medium truncate ${
              isDirectory ? 'text-blue-900 dark:text-blue-200' : 'text-gray-900 dark:text-gray-100'
            }`}>
              {highlightMatch(node.name)}
            </span>
            
            {/* Language badge */}
            {node.language && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                getLanguageBadgeColor(node.language)
              }`}>
                {node.language.toUpperCase()}
              </span>
            )}
            
            {/* File size */}
            {node.size && (
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                {formatFileSize(node.size)}
              </span>
            )}
            
            {/* Children count for directories */}
            {isDirectory && hasChildren && (
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                {node.children?.length} items
              </span>
            )}
          </div>
          
          {/* Summary */}
          {node.summary && (searchQuery === "" || node.summary.toLowerCase().includes(searchQuery.toLowerCase())) && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              {highlightMatch(node.summary)}
            </p>
          )}
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && node.summary && (
        <div
          className="fixed z-50 max-w-sm p-3 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-lg shadow-lg border border-gray-700"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="font-medium mb-1">{node.name}</div>
          <div className="text-gray-300 dark:text-gray-400 text-xs mb-2">
            {node.type === 'directory' ? 'Directory' : `${node.language || 'File'}`}
            {node.size && ` • ${formatFileSize(node.size)}`}
          </div>
          <div>{node.summary}</div>
          {/* Tooltip arrow */}
          <div 
            className="absolute w-2 h-2 bg-gray-900 dark:bg-gray-800 border-l border-t border-gray-700 transform rotate-45"
            style={{
              left: '-4px',
              top: '50%',
              transform: 'translateY(-50%) rotate(45deg)'
            }}
          />
        </div>
      )}

      {/* Children */}
      {isDirectory && hasChildren && isExpanded && (
        <div className="relative">
          {filteredChildren?.map((child, index) => (
            <TreeNode
              key={child.path}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggleExpanded={onToggleExpanded}
              onNodeSelect={onNodeSelect}
              selectedNode={selectedNode}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function hasMatchingDescendant(node: RepoTree, searchQuery: string): boolean {
  if (!node.children) return false;
  
  return node.children.some(child => 
    child.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    child.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hasMatchingDescendant(child, searchQuery)
  );
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
