"use client";

import { useState } from "react";
import RepoInput from "./RepoInput";
import JobProgress from "./JobProgress";
import RepoExplorer from "./RepoExplorer";

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

export default function RepoAnalyzer() {
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [repoTree, setRepoTree] = useState<RepoTree | null>(null);
  const [completedJobId, setCompletedJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalysisStart = (job: Job) => {
    setCurrentJob(job);
    setRepoTree(null);
    setError(null);
  };

  const handleJobComplete = (tree: RepoTree) => {
    setRepoTree(tree);
    setCompletedJobId(currentJob?.job_id || null);
    setCurrentJob(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setCurrentJob(null);
  };

  const handleReset = () => {
    setCurrentJob(null);
    setRepoTree(null);
    setCompletedJobId(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {!currentJob && !repoTree && (
        <RepoInput onAnalysisStart={handleAnalysisStart} />
      )}

      {currentJob && (
        <JobProgress 
          job={currentJob} 
          onComplete={handleJobComplete}
          onError={handleError}
          onReset={handleReset}
        />
      )}

      {repoTree && completedJobId && (
        <RepoExplorer 
          tree={repoTree}
          jobId={completedJobId}
          onReset={handleReset}
        />
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-red-800 dark:text-red-200 font-medium">Analysis Failed</h3>
          <p className="text-red-600 dark:text-red-400 mt-1">{error}</p>
          <button
            onClick={handleReset}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}