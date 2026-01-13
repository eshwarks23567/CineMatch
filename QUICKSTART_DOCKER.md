# 🎬 CineMatch - Quick Start with Docker

## Process All Movies Locally → Deploy to Render

### Step 1: Edit your TMDB API Key
Open `.env` and add your real API key:
```
TMDB_API_KEY=your_actual_tmdb_api_key_here
```

### Step 2: Install Docker
Download Docker Desktop: https://www.docker.com/products/docker-desktop

### Step 3: Process ALL 4,809 Movies
```bash
docker-compose run --rm preprocess
```
⏱️ Takes 10-15 minutes. Generates cache files with all movies.

### Step 4: Test Locally
```bash
docker-compose up
```
Visit http://localhost:5000 - All 4,809 movies loaded! 🎉

### Step 5: Deploy to Render

```bash
# Commit cache files
git add data/*.pkl data/cache_version.txt
git commit -m "Add pre-processed cache for all 4,809 movies"
git push origin main
```

Render will auto-deploy with pre-cached data - **no timeout issues!**

---

## What Changed?

✅ **Before**: 2,000 movies, processing on Render (timeouts)  
✅ **After**: 4,809 movies, pre-processed locally, instant deployment

## Cache Files

After running `docker-compose run --rm preprocess`:
- `data/processed_data_cache.pkl` (~50-80 MB)
- `data/similarity_cache.pkl` (~80-150 MB)  
- `data/cache_version.txt` (version tracking)

## Need Help?

See `README_DOCKER.md` for detailed instructions.
