import os
import tempfile
import shutil
import subprocess
import re
from typing import Optional
from urllib.parse import urlparse


class GitHubFetcher:
    """Handles fetching and extracting GitHub repositories."""
    
    @staticmethod
    def is_valid_github_url(url: str) -> bool:
        """Check if URL is a valid GitHub repository URL."""
        if not url:
            return False
            
        # Match GitHub repo URLs
        github_pattern = r'^https://github\.com/[\w.-]+/[\w.-]+(?:\.git)?/?$'
        return bool(re.match(github_pattern, url))
    
    @staticmethod
    def extract_repo_info(url: str) -> tuple[str, str]:
        """Extract owner and repo name from GitHub URL."""
        # Remove .git suffix and trailing slash
        clean_url = url.rstrip('/').replace('.git', '')
        parts = clean_url.split('/')
        
        if len(parts) >= 2:
            owner = parts[-2]
            repo = parts[-1]
            return owner, repo
        
        raise ValueError(f"Cannot extract repo info from URL: {url}")
    
    @staticmethod
    def fetch_repository(repo_url: str, progress_callback=None) -> str:
        """
        Fetch a GitHub repository and return the local path.
        
        Args:
            repo_url: GitHub repository URL
            progress_callback: Optional callback for progress updates
            
        Returns:
            str: Local path to the fetched repository
            
        Raises:
            ValueError: If URL is invalid
            subprocess.CalledProcessError: If git clone fails
        """
        if not GitHubFetcher.is_valid_github_url(repo_url):
            raise ValueError(f"Invalid GitHub repository URL: {repo_url}")
        
        if progress_callback:
            progress_callback(0.1, "Validating repository URL")
        
        # Extract repo info for naming
        try:
            owner, repo_name = GitHubFetcher.extract_repo_info(repo_url)
        except ValueError:
            raise ValueError(f"Cannot parse repository URL: {repo_url}")
        
        # Create temporary directory
        temp_base = tempfile.gettempdir()
        repo_dir = os.path.join(temp_base, f"code-atlas-{owner}-{repo_name}")
        
        # Remove existing directory if it exists
        if os.path.exists(repo_dir):
            shutil.rmtree(repo_dir)
        
        if progress_callback:
            progress_callback(0.2, "Starting repository download")
        
        try:
            # Clone the repository
            cmd = [
                "git", "clone", 
                "--depth", "1",  # Shallow clone for faster download
                "--single-branch",
                repo_url, 
                repo_dir
            ]
            
            if progress_callback:
                progress_callback(0.3, "Downloading repository files")
            
            # Run git clone with timeout
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,  # 5 minute timeout
                check=True
            )
            
            if progress_callback:
                progress_callback(0.8, "Repository downloaded successfully")
            
            # Verify the directory was created and contains files
            if not os.path.exists(repo_dir):
                raise subprocess.CalledProcessError(1, cmd, "Repository directory not created")
            
            # Count files to ensure it's not empty
            file_count = sum(1 for root, dirs, files in os.walk(repo_dir) for file in files)
            if file_count == 0:
                raise subprocess.CalledProcessError(1, cmd, "Repository appears to be empty")
            
            if progress_callback:
                progress_callback(1.0, f"Ready to analyze {file_count} files")
            
            return repo_dir
            
        except subprocess.TimeoutExpired:
            # Clean up on timeout
            if os.path.exists(repo_dir):
                shutil.rmtree(repo_dir)
            raise ValueError(f"Repository download timed out (5 minutes). The repository might be too large or network is slow.")
        
        except subprocess.CalledProcessError as e:
            # Clean up on error
            if os.path.exists(repo_dir):
                shutil.rmtree(repo_dir)
            
            error_msg = f"Failed to clone repository: {e.stderr or e.stdout or 'Unknown error'}"
            
            # Provide more specific error messages
            if "not found" in str(e.stderr).lower():
                error_msg = f"Repository not found. Please check if '{repo_url}' exists and is public."
            elif "permission denied" in str(e.stderr).lower():
                error_msg = f"Permission denied. The repository '{repo_url}' might be private."
            elif "network" in str(e.stderr).lower() or "connection" in str(e.stderr).lower():
                error_msg = "Network error. Please check your internet connection and try again."
            
            raise ValueError(error_msg)
    
    @staticmethod
    def cleanup_repository(repo_path: str) -> None:
        """Clean up the temporary repository directory."""
        if repo_path and os.path.exists(repo_path):
            try:
                shutil.rmtree(repo_path)
            except Exception as e:
                print(f"Warning: Failed to cleanup repository at {repo_path}: {e}")


# Helper function for easier imports
def fetch_github_repository(repo_url: str, progress_callback=None) -> str:
    """Convenience function to fetch a GitHub repository."""
    return GitHubFetcher.fetch_repository(repo_url, progress_callback)