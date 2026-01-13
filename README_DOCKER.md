# CineMatch Docker Setup Guide

## Overview

This guide shows you how to process all 4,809 movies locally using Docker, then deploy the pre-processed data to Render.

## Why Use Docker?

- **Process ALL movies**: No more 2,000 movie limit
- **No timeouts**: Process locally without server time limits
- **Faster deployment**: Render loads pre-cached data instantly
- **Better recommendations**: More movies = better similarity matching

## Prerequisites

1. Install Docker Desktop: https://www.docker.com/products/docker-desktop
2. Clone this repository
3. Get your TMDB API key from https://www.themoviedb.org/settings/api

## Step 1: Set Environment Variables

Create a `.env` file in the project root:

```bash
TMDB_API_KEY=your_actual_api_key_here
```

## Step 2: Process All Movies Locally

Run this command to process all 4,809 movies:

```bash
docker-compose run --rm preprocess
```

This will:
- Load all movies from CSV files
- Build the similarity matrix with 5,000 features
- Generate mood categories for each movie
- Create cache files (~100-200 MB):
  - `data/processed_data_cache.pkl`
  - `data/similarity_cache.pkl`
  - `data/cache_version.txt`

**Expected time**: 10-15 minutes depending on your machine

## Step 3: Test Locally

Start the app with Docker:

```bash
docker-compose up
```

Visit http://localhost:5000 to test the app with all movies!

## Step 4: Deploy to Render

1. **Update .gitignore** to allow cache files:
   ```bash
   # Remove data/*.pkl from .gitignore if present
   git add data/*.pkl data/cache_version.txt
   ```

2. **Commit the cache files**:
   ```bash
   git add data/
   git commit -m "Add pre-processed cache files for all 4,809 movies"
   git push origin main
   ```

3. **Render auto-deploys**:
   - Render detects the cache files
   - Skips processing (uses cached data)
   - App starts in ~30 seconds instead of timing out!

## Architecture

### Local Processing (Docker)
- Environment: `PROCESS_ALL_MOVIES=true`
- Movies: All 4,809 movies
- Features: 5,000 (better accuracy)
- Time: 10-15 minutes
- Output: Cache files

### Production (Render)
- Environment: `PROCESS_ALL_MOVIES=false` (default)
- Movies: Loads from cache (all 4,809)
- Cache: Pre-loaded from GitHub
- Startup: ~30 seconds
- Memory: Efficient (no processing)

## Troubleshooting

### Docker build fails
```bash
# Clean rebuild
docker-compose build --no-cache
```

### Cache files too large for GitHub
GitHub has a 100 MB file size limit. If cache files exceed this:

```bash
# Use Git LFS (Large File Storage)
git lfs install
git lfs track "data/*.pkl"
git add .gitattributes
git commit -m "Track large cache files with Git LFS"
```

### Out of memory during processing
Reduce features in docker-compose.yml:

```yaml
environment:
  - MAX_FEATURES=3000  # Reduce from 5000
```

## Commands Reference

```bash
# Process data
docker-compose run --rm preprocess

# Start app locally
docker-compose up

# Stop app
docker-compose down

# View logs
docker-compose logs -f

# Rebuild after code changes
docker-compose up --build

# Clean everything
docker-compose down -v
docker system prune -a
```

## File Sizes

Expected cache file sizes:
- `processed_data_cache.pkl`: ~50-80 MB
- `similarity_cache.pkl`: ~80-150 MB
- `cache_version.txt`: <1 KB

Total: ~130-230 MB (manageable with Git LFS)

## Next Steps

After successful deployment:
1. Test all splash screen buttons
2. Verify recommendation quality improved
3. Check that all 4,809 movies appear in searches
4. Monitor Render memory usage (should be <512 MB)

## Support

If you encounter issues:
1. Check Docker logs: `docker-compose logs`
2. Verify .env file has correct TMDB_API_KEY
3. Ensure data/ directory has CSV files
4. Check Git LFS setup for large files
