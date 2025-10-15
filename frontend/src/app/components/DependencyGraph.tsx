"use client";

import { useEffect, useState } from "react";

interface DependencyGraphProps {
  jobId: string;
}

interface GraphNode {
  id: string;
  label: string;
  type: string;
}

interface GraphEdge {
  from: string;
  to: string;
  type: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export default function DependencyGraph({ jobId }: DependencyGraphProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`http://localhost:8000/repos/${jobId}/graph`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setGraphData(data);
        setError(null);
      } catch (error) {
        console.error("Failed to fetch graph data:", error);
        setError("Failed to load dependency graph");
        setGraphData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGraphData();
  }, [jobId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
      <p className="text-gray-500 dark:text-gray-400 text-center">Dependency graph isn&apos;t implemented yet.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 20L28 28M28 20L20 28M9 12L12 15L9 18M9 12L6 15L9 18" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Graph not available</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Dependency graph generation is not yet implemented in the backend
          </p>
        </div>
      </div>
    );
  }

  if (!graphData || (!graphData.nodes.length && !graphData.edges.length)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12L12 8L16 12M12 8V24M16 20L20 16L24 20M20 16V32M24 28L28 24L32 28M28 24V40" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No dependencies found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            This repository doesn&apos;t seem to have detectable dependencies yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
          Dependency Graph (Coming Soon)
        </h3>
        
        {/* Simple list view of dependencies for now */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
        {graphData.nodes.map((node) => (
            <div key={node.id} className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{node.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{node.type}</p>
              </div>
            </div>
          ))}
        </div>
        
        {graphData.edges.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Connections ({graphData.edges.length})
            </h4>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {graphData.edges.map((edge, index) => (
                <div key={index} className="truncate">
                  {edge.from} → {edge.to} ({edge.type})
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          💡 Interactive graph visualization with React Flow coming soon!
        </div>
      </div>
    </div>
  );
}