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
    let timeoutId: NodeJS.Timeout;
    let pollCount = 0;
    let isActive = true;

    const getNextPollInterval = () => {
      // Smart polling: start fast, then slow down
      if (pollCount < 3) return 500;   // First 3 polls: 0.5s
      if (pollCount < 10) return 1000;  // Next 7 polls: 1s
      if (pollCount < 20) return 2000;  // Next 10 polls: 2s
      return 5000;                      // After that: 5s
    };

    const pollJob = async () => {
      if (!isActive) return;
      
      try {
        pollCount++;
        console.log(`[JobProgress] Poll #${pollCount} for job ${job.job_id}`);
        
        const response = await fetch(`http://localhost:8000/jobs/${job.job_id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const updatedJob: Job = await response.json();
        
        if (!isActive) return; // Check again after async operation
        
        setCurrentJob(updatedJob);
        setElapsedTime(Date.now() - startTime);

        if (updatedJob.state === "completed") {
          console.log(`[JobProgress] Job completed, fetching tree`);
          // Fetch the repository tree
          const treeResponse = await fetch(`http://localhost:8000/repos/${job.job_id}/tree`);
          
          if (!treeResponse.ok) {
            throw new Error(`Failed to fetch tree: ${treeResponse.status}`);
          }

          const treeData = await treeResponse.json();
          if (isActive) {
            onComplete(treeData.tree);
          }
          return; // Stop polling
        } else if (updatedJob.state === "failed") {
          console.log(`[JobProgress] Job failed: ${updatedJob.message}`);
          if (isActive) {
            onError(updatedJob.message || "Analysis failed");
          }
          return; // Stop polling
        }
        
        // Schedule next poll if job is still running
        if (isActive && (updatedJob.state === "queued" || updatedJob.state === "running")) {
          const nextInterval = getNextPollInterval();
          console.log(`[JobProgress] Scheduling next poll in ${nextInterval}ms`);
          timeoutId = setTimeout(pollJob, nextInterval);
        }
      } catch (error) {
        console.error("Failed to poll job:", error);
        if (isActive) {
          onError("Failed to check job status");
        }
      }
    };

    // Start the first poll immediately
    pollJob();

    return () => {
      console.log(`[JobProgress] Cleanup - stopping polling for job ${job.job_id}`);
      isActive = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [job.job_id, onComplete, onError, startTime]);

  const getStateColor = (state: string) => {
    switch (state) {
      case "running":
        return "text-gh-accent";
      case "completed":
        return "text-gh-success-emphasis";
      case "failed":
        return "text-gh-danger-emphasis";
      default:
        return "text-gh-text-secondary";
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
      <div className="gh-card">
        <div className="gh-card-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 bg-gh-accent rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
              <h2 className="text-lg font-semibold text-gh-text">
                Analyzing Repository
              </h2>
            </div>
            <button
              onClick={onReset}
              className="text-gh-text-secondary hover:text-gh-text transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="gh-card-body">

          <div className="space-y-6">
            {/* Overall Progress */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gh-text">
                  Progress
                </span>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gh-text-secondary">
                    {Math.round(currentJob.progress * 100)}%
                  </span>
                  <span className="text-xs text-gh-text-tertiary">
                    {formatElapsedTime(elapsedTime)}
                  </span>
                </div>
              </div>
              <div className="w-full bg-gh-canvas-subtle rounded-full h-2">
                <div 
                  className="bg-gh-accent h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${currentJob.progress * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Current Stage */}
            <div className="flex items-center justify-between p-3 bg-gh-accent-subtle rounded-md border border-gh-border">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-6 h-6 bg-gh-accent text-white rounded-full">
                  {currentJob.state === "running" ? (
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  ) : (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gh-text">
                    {getCurrentStage()}
                  </p>
                  <p className={`text-xs capitalize ${getStateColor(currentJob.state)}`}>
                    {currentJob.state}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Steps */}
            <div>
              <h4 className="text-sm font-medium text-gh-text mb-3">
                Analysis Steps
              </h4>
              <div className="space-y-2">
                {getProgressSteps().map((step, index) => (
                  <div key={step.name} className="flex items-center space-x-3">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                      step.isActive 
                        ? 'bg-gh-success-emphasis text-white' 
                        : step.isCurrent
                          ? 'bg-gh-accent text-white'
                          : 'bg-gh-canvas-subtle text-gh-text-tertiary'
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
                        ? 'text-gh-text font-medium' 
                        : 'text-gh-text-secondary'
                    }`}>
                      {step.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {currentJob.message && (
              <div className="text-sm text-gh-text-secondary bg-gh-canvas-subtle rounded-md p-3">
                <span className="font-medium">Details:</span> {currentJob.message}
              </div>
            )}

            <div className="text-xs text-gh-text-tertiary pt-2 border-t border-gh-border">
              Job ID: {currentJob.job_id}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}