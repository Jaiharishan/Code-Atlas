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
  isExpanded: boolean;
  onToggleExpanded: (path: string) => void;
  onNodeSelect: (node: RepoTree) => void;
  selectedNode: RepoTree | null;
  searchQuery: string;
}

export default function TreeNode({
  node,
  level,
  isExpanded,
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
      return isExpanded ? "📁" : "📂";
    }
    
    switch (node.language) {
      case "javascript":
      case "typescript":
        return "📜";
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
      default:
        return "📄";
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
        className={`flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded transition-colors ${
          isSelected ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500" : ""
        }`}
        style={{ paddingLeft: `${paddingLeft + 8}px` }}
        onClick={() => onNodeSelect(node)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isDirectory && hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded(node.path);
            }}
            className="mr-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {isExpanded ? "▼" : "▶"}
          </button>
        )}
        
        {(!isDirectory || !hasChildren) && (
          <span className="mr-1 w-4 text-center"></span>
        )}
        
        <span className="mr-2 text-lg">{getFileIcon()}</span>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {highlightMatch(node.name)}
            </span>
            {node.language && (
              <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                {node.language}
              </span>
            )}
            {node.size && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(node.size)}
              </span>
            )}
          </div>
          
          {node.summary && (searchQuery === "" || node.summary.toLowerCase().includes(searchQuery.toLowerCase())) && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
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

      {isDirectory && hasChildren && isExpanded && (
        <div>
          {filteredChildren?.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              level={level + 1}
              isExpanded={false} // Will be managed by parent
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}