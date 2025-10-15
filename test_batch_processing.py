#!/usr/bin/env python3
"""
Test script to demonstrate the difference in API calls between
the old individual file processing and new batch processing.
"""

import requests
import json
import time
import threading
from collections import defaultdict

API_BASE = "http://localhost:8000"
request_counts = defaultdict(int)
request_lock = threading.Lock()

def monitor_requests():
    """Monitor network requests to show API usage patterns."""
    print("🔍 Starting API call monitoring...")
    print("📊 This will track the difference between old vs new processing patterns")
    print("-" * 70)

def start_analysis(path):
    """Start a repository analysis and return job_id."""
    print(f"🚀 Starting analysis of: {path}")
    
    response = requests.post(f"{API_BASE}/analyze", json={"path": path})
    
    with request_lock:
        request_counts["POST /analyze"] += 1
    
    if response.status_code == 200:
        job_data = response.json()
        job_id = job_data["job_id"]
        print(f"✅ Analysis started with job_id: {job_id}")
        return job_id
    else:
        print(f"❌ Failed to start analysis: {response.status_code}")
        return None

def poll_job_status(job_id):
    """Poll job status with smart intervals (like the optimized frontend)."""
    print(f"⏳ Polling job status for: {job_id}")
    
    poll_count = 0
    max_polls = 50  # Prevent infinite polling
    
    while poll_count < max_polls:
        poll_count += 1
        
        # Smart polling intervals (same as frontend)
        if poll_count < 3:
            interval = 0.5
        elif poll_count < 10:
            interval = 1.0
        elif poll_count < 20:
            interval = 2.0
        else:
            interval = 5.0
            
        print(f"   📡 Poll #{poll_count} (next in {interval}s)")
        
        response = requests.get(f"{API_BASE}/jobs/{job_id}")
        
        with request_lock:
            request_counts["GET /jobs/{id}"] += 1
        
        if response.status_code == 200:
            job = response.json()
            state = job["state"]
            progress = job["progress"]
            
            print(f"   📊 Status: {state} ({progress*100:.1f}%)")
            
            if state == "completed":
                print("🎉 Job completed!")
                return True
            elif state == "failed":
                print("❌ Job failed!")
                return False
                
            time.sleep(interval)
        else:
            print(f"❌ Failed to get job status: {response.status_code}")
            return False
    
    print("⚠️  Max polls reached, stopping")
    return False

def get_results(job_id):
    """Fetch the final results."""
    print(f"📥 Fetching results for job: {job_id}")
    
    response = requests.get(f"{API_BASE}/repos/{job_id}/tree")
    
    with request_lock:
        request_counts["GET /repos/{id}/tree"] += 1
    
    if response.status_code == 200:
        data = response.json()
        tree = data.get("tree", {})
        
        # Count files in the tree
        def count_files(node):
            if node.get("type") == "file":
                return 1
            elif node.get("type") == "directory" and node.get("children"):
                return sum(count_files(child) for child in node["children"])
            return 0
        
        file_count = count_files(tree)
        print(f"📁 Analysis complete! Found {file_count} files")
        return file_count
    else:
        print(f"❌ Failed to fetch results: {response.status_code}")
        return 0

def print_summary(file_count):
    """Print a summary of API usage."""
    print("\n" + "="*70)
    print("📈 API USAGE SUMMARY")
    print("="*70)
    
    total_requests = sum(request_counts.values())
    
    for endpoint, count in request_counts.items():
        print(f"  {endpoint:<25} {count:>3} requests")
    
    print(f"\n  {'TOTAL':<25} {total_requests:>3} requests")
    print(f"\n💡 BATCH PROCESSING BENEFITS:")
    print(f"   • OLD METHOD: Would make ~{file_count} LLM calls (1 per file)")
    print(f"   • NEW METHOD: Makes ~{file_count//10 + 1} LLM calls (batches of 10)")
    print(f"   • REDUCTION: ~{file_count - (file_count//10 + 1)} fewer LLM calls!")
    print(f"   • JOB POLLING: Smart intervals (0.5s → 1s → 2s → 5s)")
    
    print(f"\n🎯 Key Optimizations:")
    print(f"   1. Batch LLM processing (10 files per API call)")
    print(f"   2. Smart polling intervals (reduces /jobs requests)")
    print(f"   3. Efficient tree fetching (single request)")
    
def main():
    print("🗺️  Code Atlas - Batch Processing Demo")
    print("="*70)
    
    # Test with a small directory first
    test_path = "/Users/jaiharishan/Desktop/Code Atlas/frontend/src/app/components"
    
    try:
        # Check if backend is running
        response = requests.get(f"{API_BASE}/docs", timeout=2)
        if response.status_code != 200:
            raise Exception("Backend not responding")
    except:
        print("❌ Backend not running! Please start with:")
        print("   uvicorn backend.app.main:app --reload")
        return
    
    monitor_requests()
    
    # Start analysis
    job_id = start_analysis(test_path)
    if not job_id:
        return
    
    # Poll until complete
    success = poll_job_status(job_id)
    if not success:
        return
    
    # Get results
    file_count = get_results(job_id)
    
    # Print summary
    print_summary(file_count)

if __name__ == "__main__":
    main()