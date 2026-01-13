#!/usr/bin/env python3
"""
Standalone script to preprocess all movie data and generate cache files.
Run this locally with Docker before deploying to Render.
"""

import os
import sys

# Set environment variable to process ALL movies
os.environ['PROCESS_ALL_MOVIES'] = 'true'

# Import the load function from app
from app import load_and_preprocess_data

def main():
    print("="*80)
    print("CINEMATCH DATA PREPROCESSING")
    print("="*80)
    print("\nThis will process ALL movies and generate cache files.")
    print("The cache files can then be deployed to Render.\n")
    
    try:
        df, similarity = load_and_preprocess_data()
        
        print("\n" + "="*80)
        print(f"✅ SUCCESS! Processed {len(df)} movies")
        print("="*80)
        print("\nGenerated files:")
        print("  - data/processed_data_cache.pkl")
        print("  - data/similarity_cache.pkl")
        print("  - data/cache_version.txt")
        print("\nNext steps:")
        print("  1. Commit the cache files: git add data/*.pkl data/cache_version.txt")
        print("  2. Push to GitHub: git push origin main")
        print("  3. Render will auto-deploy with pre-processed data!")
        print("="*80 + "\n")
        
        return 0
    except Exception as e:
        print("\n" + "="*80)
        print(f"❌ ERROR: {str(e)}")
        print("="*80 + "\n")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
