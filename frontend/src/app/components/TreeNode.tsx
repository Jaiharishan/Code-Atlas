"use client";

import { useState } from "react";
import { FileIcon, LanguageIcon } from "./LanguageIcons";

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


  return (
    <div className="relative">
      <div
        className={`file-tree-item ${isSelected ? 'selected' : ''} group`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onNodeSelect(node)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Expand/collapse button */}
        {isDirectory && hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded(node.path);
            }}
            className="expand-button mr-1"
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
          <span className="w-4 h-4 mr-1"></span>
        )}
        
        {/* File/folder icon */}
        <FileIcon 
          fileName={node.name} 
          isDirectory={isDirectory}
          className="w-4 h-4 mr-2 flex-shrink-0"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gh-text truncate">
              {highlightMatch(node.name)}
            </span>
            
            {/* Language badge */}
            {node.language && (
              <LanguageIcon 
                language={node.language} 
                fileName={node.name} 
                className="w-3 h-3"
              />
            )}
            
            {/* File size */}
            {node.size && (
              <span className="text-xs text-gh-text-tertiary bg-gh-canvas-subtle px-1.5 py-0.5 rounded text-nowrap">
                {formatFileSize(node.size)}
              </span>
            )}
            
            {/* Children count for directories */}
            {isDirectory && hasChildren && (
              <span className="text-xs text-gh-text-tertiary">
                {node.children?.length} items
              </span>
            )}
          </div>
          
          {/* Summary */}
          {node.summary && (searchQuery === "" || node.summary.toLowerCase().includes(searchQuery.toLowerCase())) && (
            <p className="text-xs text-gh-text-secondary mt-1 line-clamp-1">
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
          {filteredChildren?.map((child) => (
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


function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
