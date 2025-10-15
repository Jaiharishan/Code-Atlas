"use client";

import { useEffect, useState } from "react";

interface Job {
  job_id: string;
  state: string;
  progress: number;
  message?: string;
}

interface RepoTree {
  path: string;
  name: string;
  type: string;
  language?: string;
  size?: number;
  summary?: string;
  children?: RepoTree[];
}

interface JobProgressProps {
  job: Job;
  onComplete: (tree: RepoTree) => void;
  onError: (error: string) => void;
  onReset: () => void;
}

export default function JobProgress({ job, onComplete, onError, onReset }: JobProgressProps) {
  const [currentJob, setCurrentJob] = useState(job);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const pollJob = async () => {
      try {
        const response = await fetch(`http://localhost:8000/jobs/${job.job_id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const updatedJob: Job = await response.json();
        setCurrentJob(updatedJob);
        setElapsedTime(Date.now() - startTime);

        if (updatedJob.state === "completed") {
          // Fetch the repository tree
          const treeResponse = await fetch(`http://localhost:8000/repos/${job.job_id}/tree`);
          
          if (!treeResponse.ok) {
            throw new Error(`Failed to fetch tree: ${treeResponse.status}`);
          }

          const treeData = await treeResponse.json();
          onComplete(treeData.tree);
        } else if (updatedJob.state === "failed") {
          onError(updatedJob.message || "Analysis failed");
        }
      } catch (error) {
        console.error("Failed to poll job:", error);
        onError("Failed to check job status");
      }
    };

    const interval = setInterval(pollJob, 1000); // Poll every second

    return () => clearInterval(interval);
  }, [job.job_id, onComplete, onError, startTime]);

  const getStateColor = (state: string) => {
    switch (state) {
      case "running":
        return "text-blue-600 dark:text-blue-400";
      case "completed":
        return "text-green-600 dark:text-green-400";
      case "failed":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getCurrentStage = () => {
    const progress = currentJob.progress;
    if (progress === 0) return "Initializing";
    if (progress < 0.2) return "Scanning files";
    if (progress < 0.4) return "Detecting languages";
    if (progress < 0.6) return "Analyzing structure";
    if (progress < 0.8) return "Generating summaries";
    if (progress < 1.0) return "Finalizing";
    return "Complete";
  };

  const formatElapsedTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getProgressSteps = () => {
    const steps = [
      { name: "Initialize", threshold: 0 },
      { name: "Scan files", threshold: 0.2 },
      { name: "Detect languages", threshold: 0.4 },
      { name: "Analyze structure", threshold: 0.6 },
      { name: "Generate summaries", threshold: 0.8 },
      { name: "Complete", threshold: 1.0 }
    ];
    
    return steps.map((step, index) => ({
      ...step,
      isActive: currentJob.progress >= step.threshold,
      isCurrent: currentJob.progress >= step.threshold && 
                 (index === steps.length - 1 || currentJob.progress < steps[index + 1].threshold)
    }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            Analyzing Repository
          </h2>
          <button
            onClick={onReset}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Overall Progress */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Overall Progress
              </span>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {Math.round(currentJob.progress * 100)}%
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formatElapsedTime(elapsedTime)}
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500" 
                style={{ width: `${currentJob.progress * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Current Stage */}
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full">
                {currentJob.state === "running" ? (
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {getCurrentStage()}
                </p>
                <p className={`text-xs capitalize ${getStateColor(currentJob.state)}`}>
                  Status: {currentJob.state}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Analysis Steps
            </h4>
            <div className="space-y-2">
              {getProgressSteps().map((step, index) => (
                <div key={step.name} className="flex items-center space-x-3">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                    step.isActive 
                      ? 'bg-green-500 text-white' 
                      : step.isCurrent
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                  }`}>
                    {step.isActive && !step.isCurrent ? (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : step.isCurrent ? (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    ) : (
                      <span className="text-xs font-medium">{index + 1}</span>
                    )}
                  </div>
                  <span className={`text-sm ${
                    step.isActive 
                      ? 'text-gray-900 dark:text-gray-100 font-medium' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {step.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {currentJob.message && (
            <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-3">
              <span className="font-medium">Details:</span> {currentJob.message}
            </div>
          )}

          <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
            Job ID: {currentJob.job_id}
          </div>
        </div>
      </div>
    </div>
  );
}