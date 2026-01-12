import pandas as pd
import os

# Read the enriched dataset
print("Reading tmdb_5000_movies_enriched.csv...")
df_enriched = pd.read_csv('data/tmdb_5000_movies_enriched.csv')
print(f"Original dataset: {len(df_enriched)} movies")

# Read credits data
print("Reading tmdb_5000_credits.csv...")
df_credits = pd.read_csv('data/tmdb_5000_credits.csv')

# Filter criteria: Keep top movies based on:
# 1. High vote count (popularity indicator)
# 2. Reasonable vote average (quality indicator)
# 3. Recent movies or classics

# Let's keep top 2000 movies by vote_count
df_filtered = df_enriched.nlargest(2000, 'vote_count')
print(f"Filtered to top 2000 movies by vote_count")

# Sort by movie_id to maintain order
df_filtered = df_filtered.sort_values('id').reset_index(drop=True)

# Save reduced datasets
print("Saving reduced datasets...")
df_filtered.to_csv('data/tmdb_5000_movies_enriched.csv', index=False)
print(f"✓ Saved tmdb_5000_movies_enriched.csv: {len(df_filtered)} movies")

# Filter credits to match the movie IDs
movie_ids = set(df_filtered['id'])
df_credits_filtered = df_credits[df_credits['movie_id'].isin(movie_ids)]
df_credits_filtered.to_csv('data/tmdb_5000_credits.csv', index=False)
print(f"✓ Saved tmdb_5000_credits.csv: {len(df_credits_filtered)} movies")

# Also filter the original movies file
df_movies = pd.read_csv('data/tmdb_5000_movies.csv')
df_movies_filtered = df_movies[df_movies['id'].isin(movie_ids)]
df_movies_filtered.to_csv('data/tmdb_5000_movies.csv', index=False)
print(f"✓ Saved tmdb_5000_movies.csv: {len(df_movies_filtered)} movies")

# Calculate size reduction
# Similarity matrix is O(n²)
original_matrix_size = 4803 * 4803
new_matrix_size = 2000 * 2000
reduction = (1 - new_matrix_size / original_matrix_size) * 100

print(f"\nSize reduction:")
print(f"Original similarity matrix: {original_matrix_size:,} elements")
print(f"New similarity matrix: {new_matrix_size:,} elements")
print(f"Reduction: {reduction:.1f}%")
print(f"\nExpected cache file size: ~73MB (down from 176MB)")

print("\n✓ Dataset reduction complete!")
print("\nNext steps:")
print("1. Delete the old cache files:")
print("   - data/processed_data_cache.pkl")
print("   - data/similarity_cache.pkl")
print("2. Test the backend locally to regenerate smaller cache files")
