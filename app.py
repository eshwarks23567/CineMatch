import pandas as pd
import numpy as np
import ast
from nltk.stem.porter import PorterStemmer
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
import requests
import time
import json
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from datetime import datetime
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from urllib3 import PoolManager
from difflib import get_close_matches
import pickle


# --- Configure Requests Session with Retry Strategy ---
requests_session = requests.Session()
retry_strategy = Retry(
    total=3,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504]
)
adapter = HTTPAdapter(max_retries=retry_strategy)
requests_session.mount("https://", adapter)
requests_session.mount("http://", adapter)

# --- Connection Pooling Configuration ---
http = PoolManager(
    num_pools=5,
    maxsize=10,
    block=True
)

# --- Flask App Configuration ---
app = Flask(__name__, static_folder='dist', static_url_path='/')

# --- CORS Configuration ---
CORS(app, resources={
    r"/api/*": {"origins": "*"},
    r"/*": {"origins": "*"}
}, supports_credentials=True)

# --- Rate Limiting ---
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# --- Flask Session Configuration ---
app.secret_key = b'\x83`\xa1\x13P9HIO\xee\x82\x12\x89u/@\xe1&\\\x9eB\x84\xb5q'
app.config['SESSION_TYPE'] = 'filesystem'

# --- Configuration ---
TMDB_API_KEY = '271adabbe12ddcea31c012505d8ebb3a'
TMDB_API_KEY_PLACEHOLDER = 'YOUR_TMDB_API_KEY'

TMDB_BASE_URL = 'https://api.themoviedb.org/3'
TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'
PLACEHOLDER_IMAGE_URL = 'https://placehold.co/200x300/333/999?text=No+Poster'

# Data paths
data_dir = 'data'
movies_csv_path = os.path.join(data_dir, 'tmdb_5000_movies.csv')
credits_csv_path = os.path.join(data_dir, 'tmdb_5000_credits.csv')
enriched_data_path = os.path.join(data_dir, 'tmdb_5000_movies_enriched.csv')
processed_data_cache_path = os.path.join(data_dir, 'processed_data_cache.pkl')
similarity_cache_path = os.path.join(data_dir, 'similarity_cache.pkl')

ENRICHMENT_REQUIRED = False
ENRICHMENT_BATCH_SIZE = 50
ENRICHMENT_DELAY_SECONDS = 1.1

# Download NLTK data before initializing analyzer
try:
    nltk.data.find('sentiment/vader_lexicon.zip')
except LookupError:
    print("Downloading vader_lexicon...")
    nltk.download('vader_lexicon')

df = None
similarity = None
analyzer = SentimentIntensityAnalyzer()

# --- Helper Functions ---
def safe_literal_eval(s):
    if not isinstance(s, str) or not s.strip():
        return []
    try:
        if s.strip().startswith(('{', '[')) and s.strip().endswith(('}', ']')):
            return ast.literal_eval(s)
        return s
    except (ValueError, SyntaxError, TypeError):
        return []

def fetch_genres(data):
    result_list = []
    actual_data = []

    if isinstance(data, str):
        try:
            parsed_data = ast.literal_eval(data)
            if not isinstance(parsed_data, list): actual_data = [parsed_data]
            else: actual_data = parsed_data
        except (ValueError, SyntaxError, TypeError):
            if data: actual_data = [data]
    elif isinstance(data, list): actual_data = data

    for item in actual_data:
        if isinstance(item, dict) and 'name' in item: result_list.append(str(item['name']))
        elif isinstance(item, str): result_list.append(item)
    return result_list

def fetch_keywords(data):
    result_list = []
    actual_data = []
    if isinstance(data, str):
        try:
            parsed_data = ast.literal_eval(data)
            if not isinstance(parsed_data, list): actual_data = [parsed_data]
            else: actual_data = parsed_data
        except (ValueError, SyntaxError, TypeError):
            if data: actual_data = [data]
    elif isinstance(data, list): actual_data = data
    for item in actual_data:
        if isinstance(item, dict) and 'name' in item: result_list.append(str(item['name']))
        elif isinstance(item, str): result_list.append(item)
    return result_list

def fetch_cast(data):
    L = [] ; counter = 0 ; actual_data = []
    if isinstance(data, str):
        try: parsed_data = ast.literal_eval(data)
        except (ValueError, SyntaxError, TypeError):
            if data: parsed_data = [data]
        if isinstance(parsed_data, list): actual_data = parsed_data
        elif isinstance(parsed_data, str): actual_data = [parsed_data]
    elif isinstance(data, list): actual_data = data
    for item in actual_data:
        if isinstance(item, dict) and 'name' in item:
            if counter < 3: L.append(item['name']) ; counter += 1
            else: break
        elif isinstance(item, str):
            if counter < 3: L.append(item) ; counter += 1
            else: break
    return L

def fetch_crew(data):
    L = [] ; actual_data = []
    if isinstance(data, str):
        try: parsed_data = ast.literal_eval(data)
        except (ValueError, SyntaxError, TypeError):
            if data: parsed_data = [data]
        if isinstance(parsed_data, list): actual_data = parsed_data
        elif isinstance(parsed_data, str): actual_data = [parsed_data]
    elif isinstance(data, list): actual_data = data
    for item in actual_data:
        if isinstance(item, dict) and 'job' in item and item['job'] == 'Director' and 'name' in item: L.append(item['name'])
        elif isinstance(item, str): L.append(item)
    return L

def fetch_and_parse_tmdb_details(movie_id):
    if isinstance(movie_id, (pd.Series, pd.DataFrame)):
        movie_id = movie_id.iloc[0] if isinstance(movie_id, pd.Series) else movie_id.iloc[0,0]
    
    try: movie_id = int(movie_id)
    except (ValueError, TypeError):
        print(f"Invalid movie ID format: {movie_id}")
        return {
            'tmdb_poster_path': None, 'tmdb_year': 'Unknown', 'tmdb_genres': [],
            'tmdb_vote_average': None, 'tmdb_vote_count': None, 'tmdb_collection_id': None,
            'tmdb_original_language': 'N/A'
        }
    
    url = f"{TMDB_BASE_URL}/movie/{movie_id}?api_key={TMDB_API_KEY}&language=en-US"
    retries = 3 ; base_delay = 2
    for attempt in range(retries):
        try:
            response = requests_session.get(url, timeout=10)
            if response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', base_delay))
                print(f"Rate limited. Waiting {retry_after} seconds before retry...")
                time.sleep(retry_after) ; continue
            response.raise_for_status()
            data = response.json()
            poster_path = data.get('poster_path')
            release_date = data.get('release_date')
            year = release_date.split('-')[0] if release_date else 'Unknown'
            genres = [g['name'] for g in data.get('genres', [])]
            vote_average = data.get('vote_average')
            vote_count = data.get('vote_count')
            original_language = data.get('original_language', 'N/A')
            collection_info = data.get('belongs_to_collection')
            collection_id = collection_info.get('id') if collection_info else None
            return {
                'tmdb_poster_path': poster_path, 'tmdb_year': year, 'tmdb_genres': genres,
                'tmdb_vote_average': vote_average, 'tmdb_vote_count': vote_count,
                'tmdb_collection_id': collection_id, 'tmdb_original_language': original_language
            }
        except requests.exceptions.RequestException as e:
            if attempt < retries - 1:
                current_delay = base_delay * (attempt + 1)
                print(f"WARNING: API call failed for movie ID {movie_id} (Attempt {attempt + 1}/{retries}). Retrying in {current_delay}s. Error: {str(e)}")
                time.sleep(current_delay)
            else:
                print(f"ERROR: API call failed permanently for movie ID {movie_id} after {retries} attempts. Error: {str(e)}")
                return {
                    'tmdb_poster_path': None, 'tmdb_year': 'Unknown', 'tmdb_genres': [],
                    'tmdb_vote_average': None, 'tmdb_vote_count': None, 'tmdb_collection_id': None,
                    'tmdb_original_language': 'N/A'
                }
    return {
        'tmdb_poster_path': None, 'tmdb_year': 'Unknown', 'tmdb_genres': [],
        'tmdb_vote_average': None, 'tmdb_vote_count': None, 'tmdb_collection_id': None,
        'tmdb_original_language': 'N/A'
    }

def enrich_data_with_tmdb_api(initial_df):
    if TMDB_API_KEY == TMDB_API_KEY_PLACEHOLDER or not TMDB_API_KEY:
        print("TMDb API Key not configured. Skipping API enrichment.")
        initial_df['tmdb_poster_path'] = None
        initial_df['tmdb_year'] = 'Unknown'
        initial_df['tmdb_genres'] = [[] for _ in range(len(initial_df))]
        initial_df['tmdb_vote_average'] = None
        initial_df['tmdb_vote_count'] = None
        initial_df['tmdb_collection_id'] = None
        initial_df['tmdb_original_language'] = 'N/A'
        return initial_df

    print("Starting TMDb data enrichment...")
    
    # Create a working copy
    working_df = initial_df.copy()
    
    # Ensure movie_id exists and is properly formatted
    if 'movie_id' not in working_df.columns:
        if 'id' in working_df.columns:
            working_df['movie_id'] = working_df['id']
        else:
            working_df['movie_id'] = working_df.index
    
    # Convert to string first to preserve all values
    working_df['movie_id_str'] = working_df['movie_id'].astype(str)
    
    # Then convert to numeric, keeping original string values where conversion fails
    working_df['movie_id'] = pd.to_numeric(working_df['movie_id'], errors='coerce')
    
    # For non-numeric IDs, use the string hash
    nan_mask = working_df['movie_id'].isna()
    if nan_mask.any():
        working_df.loc[nan_mask, 'movie_id'] = working_df.loc[nan_mask, 'movie_id_str'].apply(hash)
    
    # Process all movies
    enriched_data_rows = []
    total_movies = len(working_df)
    
    for i, (_, row) in enumerate(working_df.iterrows()):
        movie_id = row['movie_id']
        original_id = row['movie_id_str']
        
        # Try to fetch details for numeric IDs
        if str(original_id).isdigit():
            details = fetch_and_parse_tmdb_details(int(original_id))
        else:
            # For non-numeric IDs, use default values
            details = {
                'tmdb_poster_path': None,
                'tmdb_year': 'Unknown',
                'tmdb_genres': [],
                'tmdb_vote_average': None,
                'tmdb_vote_count': None,
                'tmdb_collection_id': None,
                'tmdb_original_language': 'N/A'
            }
        
        row_dict = row.to_dict()
        row_dict.update(details)
        enriched_data_rows.append(row_dict)
        
        if (i + 1) % ENRICHMENT_BATCH_SIZE == 0:
            print(f"Processed {i + 1}/{total_movies} movies...")
            time.sleep(ENRICHMENT_DELAY_SECONDS)
    
    print(f"Enrichment complete. Processed {len(enriched_data_rows)} movies.")
    return pd.DataFrame(enriched_data_rows)

def load_and_preprocess_data():
    global df, similarity, analyzer
    
    # Check if cached processed data exists
    if os.path.exists(processed_data_cache_path) and os.path.exists(similarity_cache_path):
        print("Loading cached processed data and similarity matrix...")
        try:
            with open(processed_data_cache_path, 'rb') as f:
                df = pickle.load(f)
            with open(similarity_cache_path, 'rb') as f:
                similarity = pickle.load(f)
            print("Cached data loaded successfully!")
            return df, similarity
        except Exception as e:
            print(f"Error loading cache: {e}. Reprocessing data...")
    
    # Load sentiment analyzer
    try:
        nltk.data.find('sentiment/vader_lexicon.zip')
    except:
        nltk.download('vader_lexicon')

    # Load data
    if os.path.exists(enriched_data_path) and not ENRICHMENT_REQUIRED:
        print("Loading cached enriched data")
        df_base = pd.read_csv(enriched_data_path)
    else:
        print("Loading and processing raw data")
        movies_raw = pd.read_csv(movies_csv_path)
        credits_raw = pd.read_csv(credits_csv_path)
        
        # Clean up column names before merge
        movies_raw.columns = [col.strip() for col in movies_raw.columns]
        credits_raw.columns = [col.strip() for col in credits_raw.columns]
        
        # Merge with explicit handling of duplicate columns
        df_base = pd.merge(
            movies_raw,
            credits_raw,
            on='title',
            how='left',
            suffixes=('_movies', '_credits')
        )
        
        # Handle ID columns - prioritize numeric IDs
        if 'id_movies' in df_base.columns:
            df_base['movie_id'] = df_base['id_movies']
        elif 'id_credits' in df_base.columns:
            df_base['movie_id'] = df_base['id_credits']
        elif 'id' in df_base.columns:
            df_base['movie_id'] = df_base['id']
        else:
            print("No ID column found - using index")
            df_base['movie_id'] = df_base.index
        
        print(f"Total movies before enrichment: {len(df_base)}")
        df_base = enrich_data_with_tmdb_api(df_base)
        print(f"Total movies after enrichment: {len(df_base)}")
        df_base.to_csv(enriched_data_path, index=False)
    
    # Rest of your preprocessing...
        print(f"Enriched data saved to cache: {enriched_data_path}")
    
    required_cols = ['movie_id', 'title', 'overview', 'genres', 'keywords', 'cast', 'crew', 'tmdb_poster_path', 'tmdb_year', 'tmdb_genres', 'tmdb_vote_average', 'tmdb_vote_count', 'tmdb_collection_id', 'tmdb_original_language']
    
    missing_cols = [col for col in required_cols if col not in df_base.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns in data: {missing_cols}")

    movies_processed = df_base[required_cols].copy()
    # Preserve original overview text for API responses before tokenization
    movies_processed['overview_text'] = df_base['overview'].fillna('').astype(str)
    
    list_cols = ['overview', 'genres', 'keywords', 'cast', 'crew']
    for col in list_cols:
        movies_processed[col] = movies_processed[col].fillna('[]')

    movies_processed.dropna(subset=['overview', 'genres', 'keywords', 'cast', 'crew'], inplace=True)
    
    for col in list_cols:
        movies_processed[col] = movies_processed[col].apply(safe_literal_eval)

    # FIX: Apply the specific parsing functions to the appropriate columns
    movies_processed['genres'] = movies_processed['genres'].apply(fetch_genres)
    movies_processed['keywords'] = movies_processed['keywords'].apply(fetch_keywords)
    movies_processed['cast'] = movies_processed['cast'].apply(fetch_cast)
    movies_processed['crew'] = movies_processed['crew'].apply(fetch_crew)

    # Process overview differently since it's text, not a list
    movies_processed['overview'] = movies_processed['overview'].apply(
        lambda x: x.lower().split() if isinstance(x, str) else []
    )

    # Create display copies for cast and directors before tokenization
    movies_processed['cast_display'] = movies_processed['cast'].apply(lambda x: [i for i in x if isinstance(i, str)])
    movies_processed['directors_display'] = movies_processed['crew'].apply(lambda x: [i for i in x if isinstance(i, str)])

    # Build tokenized lists for modeling/search without altering display names
    def tokenize_list(lst):
        return [str(item).replace(" ", "").lower() for item in (lst or []) if item is not None]

    movies_processed['genres_tokens'] = movies_processed['genres'].apply(tokenize_list)
    movies_processed['keywords_tokens'] = movies_processed['keywords'].apply(tokenize_list)
    movies_processed['cast_tokens'] = movies_processed['cast_display'].apply(tokenize_list)
    movies_processed['crew_tokens'] = movies_processed['directors_display'].apply(tokenize_list)

    # Overview tokens
    movies_processed['overview_tokens'] = movies_processed['overview'].apply(lambda x: [str(tok).lower() for tok in x])

    movies_processed['overview_str'] = movies_processed['overview_tokens'].apply(lambda x: " ".join(x))
    movies_processed['sentiment_score'] = movies_processed['overview_str'].apply(lambda x: analyzer.polarity_scores(x)['compound'])
    
    def get_mood_category(score, tmdb_genres):
        genres_list = [g.lower() for g in tmdb_genres if isinstance(g, str)] if isinstance(tmdb_genres, list) else []
        # Highly specific mappings first
        if 'horror' in genres_list:
            return 'Horror'
        if 'mystery' in genres_list or 'crime' in genres_list or 'thriller' in genres_list:
            return 'Intense/Mystery'
        # Broader genres next
        if 'comedy' in genres_list and 'romance' in genres_list:
            return 'Romcom'
        if 'comedy' in genres_list or 'family' in genres_list or 'animation' in genres_list:
            return 'Happy'
        # Add sad category based on genre and sentiment
        if score < -0.3 and ('drama' in genres_list or any(g in genres_list for g in ['romance', 'war'])):
            return 'Sad'
        if 'drama' in genres_list or 'romance' in genres_list:
            return 'Romantic/Dramatic'
        if 'documentary' in genres_list or 'history' in genres_list:
            return 'Thought-Provoking'
        if 'action' in genres_list or 'adventure' in genres_list:
            return 'Action/Adventure'
        if 'music' in genres_list or 'fantasy' in genres_list or 'science fiction' in genres_list:
            return 'Escapist'
        # Fallback to sentiment (avoid Neutral category)
        if score >= 0.5:
            return 'Happy'
        elif score <= -0.5:
            return 'Sad'
        return 'Happy'

    movies_processed['mood_category'] = movies_processed.apply(
        lambda row: get_mood_category(row['sentiment_score'], row['tmdb_genres']), axis=1
    )

    movies_processed['tags'] = movies_processed['overview_tokens'] + movies_processed['genres_tokens'] + movies_processed['keywords_tokens'] + movies_processed['cast_tokens'] + movies_processed['crew_tokens']
    df = movies_processed[['movie_id', 'title', 'tags', 'tmdb_poster_path', 'tmdb_year', 'tmdb_genres', 'tmdb_vote_average', 'tmdb_vote_count', 'mood_category', 'tmdb_original_language', 'tmdb_collection_id', 'overview_text']].copy()
    # Attach display names for API responses
    df['cast'] = movies_processed['cast_display']
    df['crew'] = movies_processed['directors_display']
    df['tags'] = df['tags'].apply(lambda x: " ".join(x))
    df['tags'] = df['tags'].apply(lambda x: x.lower())
    ps = PorterStemmer()
    df['tags'] = df['tags'].apply(lambda text: " ".join([ps.stem(i) for i in text.split()]))
    cv = CountVectorizer(max_features=5000, stop_words='english')
    vectors = cv.fit_transform(df['tags']).toarray()
    similarity = cosine_similarity(vectors)
    
    # Cache the processed data and similarity matrix
    print("Caching processed data and similarity matrix...")
    try:
        with open(processed_data_cache_path, 'wb') as f:
            pickle.dump(df, f)
        with open(similarity_cache_path, 'wb') as f:
            pickle.dump(similarity, f)
        print(f"Cached data saved to {processed_data_cache_path} and {similarity_cache_path}")
    except Exception as e:
        print(f"Warning: Could not cache data: {e}")
    
    print("Data loading and model preprocessing complete.")
    return df, similarity

def recommend(movie_title):
    global df, similarity
    if df is None or similarity is None:
        df, similarity = load_and_preprocess_data()

    if df is None or similarity is None:
        return [{
            "title": "Recommendation system not ready.",
            "poster_url": PLACEHOLDER_IMAGE_URL,
            "year": "N/A",
            "genres": [],
            "vote_average": None,
            "movie_id": None,
            "language": "N/A"
        }]

    try:
        query = movie_title.strip().lower()

        # Try exact match first
        movie_matches = df[df['title'].str.lower().str.strip() == query]

        # If no exact match, try fuzzy match
        if movie_matches.empty:
            close_matches = get_close_matches(query, df['title'].str.lower(), n=1, cutoff=0.6)
            if close_matches:
                movie_matches = df[df['title'].str.lower() == close_matches[0]]

        if movie_matches.empty:
            return [{
                "title": f"Movie '{movie_title}' not found in database.",
                "poster_url": PLACEHOLDER_IMAGE_URL,
                "year": "N/A",
                "genres": [],
                "vote_average": None,
                "movie_id": None,
                "language": "N/A"
            }]

        # Determine positional index to align with the similarity matrix
        base_movie_idx = df.index.get_loc(movie_matches.index[0])
        base_movie = movie_matches.iloc[0]
        recommended_movies = []

        # Enhanced recommendation strategy with multiple layers
        
        # 1. Collection/Franchise-based recommendations (highest priority)
        base_title_parts = base_movie['title'].lower().split(':')[0].split('-')[0].strip()
        is_franchise = False
        
        if pd.notna(base_movie['tmdb_collection_id']):
            collection_movies = df[
                (df['tmdb_collection_id'] == base_movie['tmdb_collection_id']) &
                (df['title'].str.lower() != base_movie['title'].lower())
            ].sort_values('tmdb_year').head(3).to_dict('records')
            is_franchise = True
        else:
            # Try title matching for franchises
            collection_movies = df[
                (df['title'].str.lower().str.contains(base_title_parts, regex=False)) &
                (df['title'].str.lower() != base_movie['title'].lower()) &
                (df['tmdb_genres'].apply(lambda x: any(g in base_movie['tmdb_genres'] for g in (x or []))))
            ].sort_values('tmdb_year').head(3).to_dict('records')
            is_franchise = len(collection_movies) > 0

        for movie in collection_movies:
            recommended_movies.append({
                'movie_id': int(movie['movie_id']),
                'title': movie['title'],
                'poster_url': f"{TMDB_IMAGE_BASE_URL}{movie['tmdb_poster_path']}" 
                               if pd.notna(movie['tmdb_poster_path']) else PLACEHOLDER_IMAGE_URL,
                'year': movie['tmdb_year'],
                'genres': movie['tmdb_genres'],
                'vote_average': float(movie['tmdb_vote_average']) if pd.notna(movie['tmdb_vote_average']) else None,
                'language': movie['tmdb_original_language'].upper() if pd.notna(movie['tmdb_original_language']) else 'N/A',
                'cast': (movie.get('cast')[:3] if isinstance(movie.get('cast'), list) else []),
                'directors': (movie.get('crew') if isinstance(movie.get('crew'), list) else []),
                'overview': movie.get('overview_text', ''),
                'recommendation_reason': 'Same Franchise'
            })

        # 2. Content-based similarity recommendations with quality filtering
        if len(recommended_movies) < 20:
            sim_scores = list(enumerate(similarity[base_movie_idx]))
            sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
            sim_scores = [x for x in sim_scores if x[0] != base_movie_idx]
            
            # Apply diversity and quality filters
            for idx, sim_score in sim_scores:
                if len(recommended_movies) >= 20:
                    break
                    
                similar_movie = df.iloc[idx]
                
                # Skip if already recommended
                if similar_movie['title'] in [m['title'] for m in recommended_movies]:
                    continue
                
                # Quality filter: prioritize highly-rated movies (vote_average >= 6.5)
                if pd.notna(similar_movie['tmdb_vote_average']) and similar_movie['tmdb_vote_average'] < 6.0:
                    continue
                    
                # Diversity filter: ensure genre overlap but not identical
                base_genres = set(base_movie['tmdb_genres'] or [])
                similar_genres = set(similar_movie['tmdb_genres'] or [])
                genre_overlap = len(base_genres & similar_genres)
                
                if genre_overlap > 0:  # At least some genre overlap
                    reason = 'Similar Content'
                    if sim_score > 0.8:
                        reason = 'Highly Similar'
                    elif genre_overlap >= len(base_genres) * 0.7:
                        reason = 'Similar Genre & Style'
                    
                    recommended_movies.append({
                        'movie_id': int(similar_movie['movie_id']),
                        'title': similar_movie['title'],
                        'poster_url': f"{TMDB_IMAGE_BASE_URL}{similar_movie['tmdb_poster_path']}" 
                                       if pd.notna(similar_movie['tmdb_poster_path']) else PLACEHOLDER_IMAGE_URL,
                        'year': similar_movie['tmdb_year'],
                        'genres': similar_movie['tmdb_genres'],
                        'vote_average': float(similar_movie['tmdb_vote_average']) if pd.notna(similar_movie['tmdb_vote_average']) else None,
                        'language': similar_movie['tmdb_original_language'].upper() if pd.notna(similar_movie['tmdb_original_language']) else 'N/A',
                        'cast': (similar_movie['cast'][:3] if isinstance(similar_movie['cast'], list) else []),
                        'directors': (similar_movie['crew'] if isinstance(similar_movie['crew'], list) else []),
                        'overview': similar_movie.get('overview_text', ''),
                        'similarity_score': float(sim_score),
                        'recommendation_reason': reason
                    })

        # 3. Rank by multiple factors for final output
        def recommendation_score(movie):
            score = 0
            # Franchise movies get highest priority
            if movie.get('recommendation_reason') == 'Same Franchise':
                score += 100
            # High similarity score
            score += movie.get('similarity_score', 0) * 50
            # High rating boost
            if movie.get('vote_average'):
                score += movie['vote_average'] * 5
            # Recency boost (newer movies slight advantage)
            if movie.get('year') and movie['year'].isdigit():
                year_score = (int(movie['year']) - 1900) / 100
                score += year_score
            return score
        
        # Sort by composite score
        recommended_movies.sort(key=recommendation_score, reverse=True)
        
        return recommended_movies[:20]  # Return top 20

        return recommended_movies[:5]

    except Exception as e:
        print(f"Error in recommendation for '{movie_title}': {str(e)}")
        return [{
            "title": f"Error processing recommendation: {str(e)}",
            "poster_url": PLACEHOLDER_IMAGE_URL,
            "year": "N/A",
            "genres": [],
            "vote_average": None,
            "movie_id": None,
            "language": "N/A"
        }]

@app.route('/top_watched')
def get_top_watched_movies():
    global df
    if df is None: df, _ = load_and_preprocess_data()
    top_movies = df[df['tmdb_vote_count'].notna() & (df['tmdb_vote_count'] >= 100)].sort_values(by=['tmdb_vote_average', 'tmdb_vote_count'], ascending=[False, False]).to_dict('records')
    formatted_top_movies = []
    for movie in top_movies:
        poster_url = f"{TMDB_IMAGE_BASE_URL}{movie['tmdb_poster_path']}" if pd.notna(movie['tmdb_poster_path']) else PLACEHOLDER_IMAGE_URL
        formatted_top_movies.append({
            'movie_id': int(movie['movie_id']), 'title': movie['title'], 'poster_url': poster_url,
            'year': movie['tmdb_year'], 'genres': movie['tmdb_genres'],
            'vote_average': float(movie['tmdb_vote_average']) if pd.notna(movie['tmdb_vote_average']) else None,
            'language': movie['tmdb_original_language'].upper() if pd.notna(movie['tmdb_original_language']) else 'N/A',
            'cast': (movie['cast'][:3] if isinstance(movie.get('cast'), list) else []),
            'directors': (movie['crew'] if isinstance(movie.get('crew'), list) else []),
            'overview': movie.get('overview_text', '')
        })
    return jsonify({"movies": formatted_top_movies[:10]})

@app.route('/moodwise_text_input', methods=['POST'])
def recommend_by_text_mood():
    global df
    if df is None: df, _ = load_and_preprocess_data()
    data = request.get_json()
    user_text = data.get('text')
    if not user_text: return jsonify({"error": "Text input is required"}), 400
    user_sentiment = analyzer.polarity_scores(user_text)['compound']
    
    def classify_user_mood(sentiment_score, user_text_lower):
        # Normalize input for simpler matching
        text = user_text_lower

        # Emotional/Dramatic routes
        if any(kw in text for kw in ['had a tough day', 'tough day', 'stress', 'stressed', 'exhausted', 'tired', 'drained', 'burnt out', 'burned out', 'overwhelmed', 'sad', 'heartbroken', 'heart broken', 'breakup', 'broke up', 'lonely', 'alone', 'depressed']):
            return 'Drama'

        # Strong signals first
        if any(kw in text for kw in ['horror', 'scary', 'spooky', 'creepy', 'gore', 'gory', 'slasher', 'ghost', 'zombie', 'paranormal', 'possession']):
            return 'Horror'
        if any(kw in text for kw in [
            'mystery', 'crime', 'detective', 'puzzle', 'thriller', 'thrilling', 'suspense', 'noir', 'whodunit',
            'psychological', 'twist', 'investigation', 'serial killer', 'heist', 'conspiracy']):
            return 'Intense/Mystery'

        # Other categories
        if any(kw in text for kw in ['romcom', 'rom-com', 'romantic comedy', 'meet-cute', 'date night', 'banter', 'cute rom', 'feel-good romance', 'light romance']):
            return 'Romcom'
        if any(kw in text for kw in ['romantic', 'love', 'romance', 'relationship', 'heartfelt', 'romantic drama']):
            return 'Romantic/Dramatic'
        if any(kw in text for kw in ['action', 'adventure', 'fight', 'battle', 'chase', 'spy', 'espionage', 'war', 'martial arts', 'car chase', 'explosive']):
            return 'Action/Adventure'
        if any(kw in text for kw in ['happy', 'joyful', 'fun', 'uplifting', 'comedy', 'lighthearted', 'feel-good', 'wholesome', 'family-friendly', 'light']):
            return 'Happy'
        if any(kw in text for kw in ['documentary', 'learn', 'explore', 'history', 'biography', 'biopic', 'informative', 'educational', 'philosophical', 'mind-bending', 'political', 'social issues', 'true story']):
            return 'Thought-Provoking'
        if any(kw in text for kw in ['chill', 'relax', 'calm', 'peaceful', 'cozy', 'comfort', 'soothing', 'slow', 'slice of life']):
            return 'Relaxing'
        if any(kw in text for kw in ['fantasy', 'sci-fi', 'science fiction', 'fiction', 'space', 'aliens', 'superhero', 'magical', 'mythical', 'space opera', 'time travel']):
            return 'Escapist'
        if any(kw in text for kw in ['sad', 'melodrama', 'tragic', 'weepie', 'emotional', 'poignant', 'heartbreaking']):
            return 'Drama'

        # Sentiment-based fallback (no Neutral)
        if sentiment_score >= 0.7:
            return 'Happy'
        elif sentiment_score >= 0.3:
            return 'Relaxing'
        elif sentiment_score <= -0.5:
            return 'Drama'
        elif sentiment_score <= -0.2:
            return 'Intense/Mystery'
        else:
            return 'Happy'
    
    desired_mood = classify_user_mood(user_sentiment, user_text.lower())
    
    # Apply strict genre-based filtering for certain moods
    if desired_mood == 'Horror':
        mood_movies = df[df['tmdb_genres'].apply(lambda gs: isinstance(gs, list) and any(isinstance(g, str) and g.lower() == 'horror' for g in gs))]
    elif desired_mood == 'Intense/Mystery':
        mood_movies = df[df['tmdb_genres'].apply(lambda gs: isinstance(gs, list) and any(isinstance(g, str) and g.lower() in ['mystery', 'crime', 'thriller'] for g in gs))]
    elif desired_mood == 'Romcom':
        mood_movies = df[df['tmdb_genres'].apply(lambda gs: isinstance(gs, list) and set([g.lower() for g in gs if isinstance(g, str)]).issuperset({'comedy', 'romance'}))]
    elif desired_mood == 'Drama':
        mood_movies = df[df['tmdb_genres'].apply(lambda gs: isinstance(gs, list) and any(isinstance(g, str) and g.lower() == 'drama' for g in gs))]
    elif desired_mood == 'Relaxing':
        mood_movies = df[df['tmdb_genres'].apply(lambda gs: isinstance(gs, list) and any(isinstance(g, str) and g.lower() in ['comedy', 'family', 'animation'] for g in gs))]
    else:
        mood_movies = df[df['mood_category'] == desired_mood]

    mood_movies = mood_movies[mood_movies['tmdb_vote_count'].notna() & (mood_movies['tmdb_vote_count'] >= 10)]
    formatted_movies = []
    mood_movies_list_of_dicts = mood_movies.sort_values(by=['tmdb_vote_average', 'tmdb_vote_count'], ascending=[False, False]).head(10).to_dict('records')
    for movie in mood_movies_list_of_dicts:
        poster_url = f"{TMDB_IMAGE_BASE_URL}{movie['tmdb_poster_path']}" if pd.notna(movie['tmdb_poster_path']) else PLACEHOLDER_IMAGE_URL
        formatted_movies.append({
            'movie_id': int(movie['movie_id']), 'title': movie['title'], 'poster_url': poster_url,
            'year': movie['tmdb_year'], 'genres': movie['tmdb_genres'],
            'vote_average': float(movie['tmdb_vote_average']) if pd.notna(movie['tmdb_vote_average']) else None,
            'language': movie['tmdb_original_language'].upper() if pd.notna(movie['tmdb_original_language']) else 'N/A',
            'cast': (movie['cast'][:3] if isinstance(movie.get('cast'), list) else []),
            'directors': (movie['crew'] if isinstance(movie.get('crew'), list) else [])
        })
    return jsonify({"movies": formatted_movies, "mood_detected": desired_mood})

@app.route('/get_movies_by_mood_category', methods=['POST'])
def get_movies_by_mood_category_route():
    global df
    if df is None: df, _ = load_and_preprocess_data()
    data = request.get_json()
    category = data.get('category')
    if not category: return jsonify({"error": "Category is required"}), 400
    # Normalize category naming and apply strict filtering for specific moods
    requested = str(category).strip()
    category_norm = 'Intense/Mystery' if requested in ['Intense', 'Intense/Mystery', 'Intense Mystery', 'Mystery/Intense'] else requested

    if category_norm == 'Horror':
        mood_movies = df[df['tmdb_genres'].apply(lambda gs: isinstance(gs, list) and any(isinstance(g, str) and g.lower() == 'horror' for g in gs))]
    elif category_norm == 'Intense/Mystery':
        mood_movies = df[df['tmdb_genres'].apply(lambda gs: isinstance(gs, list) and any(isinstance(g, str) and g.lower() in ['mystery', 'crime', 'thriller'] for g in gs))]
    elif category_norm == 'Romcom':
        mood_movies = df[df['tmdb_genres'].apply(lambda gs: isinstance(gs, list) and set([g.lower() for g in gs if isinstance(g, str)]).issuperset({'comedy', 'romance'}))]
    elif category_norm == 'Drama':
        mood_movies = df[df['tmdb_genres'].apply(lambda gs: isinstance(gs, list) and any(isinstance(g, str) and g.lower() == 'drama' for g in gs))]
    elif category_norm in ['Western', 'Fantasy', 'Superhero', 'Science Fiction', 'Sci-Fi', 'Scifiction']:
        def genre_match(gs, targets):
            if not isinstance(gs, list):
                return False
            lower = [g.lower() for g in gs if isinstance(g, str)]
            if 'western' in targets:
                return 'western' in lower
            if 'fantasy' in targets:
                return 'fantasy' in lower
            if 'science fiction' in targets:
                return 'science fiction' in lower or 'sci-fi' in lower
            if 'superhero' in targets:
                return (('science fiction' in lower or 'fantasy' in lower) and ('action' in lower or 'adventure' in lower))
            return False
        key = category_norm.lower()
        canonical = 'science fiction' if key in ['science fiction', 'sci-fi', 'scifiction'] else key
        mood_movies = df[df['tmdb_genres'].apply(lambda gs: genre_match(gs, [canonical]))]
    else:
        mood_movies = df[df['mood_category'] == category_norm]
    mood_movies = mood_movies[mood_movies['tmdb_vote_count'].notna() & (mood_movies['tmdb_vote_count'] >= 10)]
    formatted_movies = []
    mood_movies_list_of_dicts = mood_movies.sort_values(by=['tmdb_vote_average', 'tmdb_vote_count'], ascending=[False, False]).head(10).to_dict('records')
    for movie in mood_movies_list_of_dicts:
        poster_url = f"{TMDB_IMAGE_BASE_URL}{movie['tmdb_poster_path']}" if pd.notna(movie['tmdb_poster_path']) else PLACEHOLDER_IMAGE_URL
        formatted_movies.append({
            'movie_id': int(movie['movie_id']), 'title': movie['title'], 'poster_url': poster_url,
            'year': movie['tmdb_year'], 'genres': movie['tmdb_genres'],
            'vote_average': float(movie['tmdb_vote_average']) if pd.notna(movie['tmdb_vote_average']) else None,
            'language': movie['tmdb_original_language'].upper() if pd.notna(movie['tmdb_original_language']) else 'N/A',
            'cast': (movie['cast'][:3] if isinstance(movie.get('cast'), list) else []),
            'directors': (movie['crew'] if isinstance(movie.get('crew'), list) else [])
        })
    return jsonify({"movies": formatted_movies, "mood_detected": category_norm})

@app.route('/add_to_collection', methods=['POST'])
def add_to_collection():
    try:
        movie_data = request.get_json()
        movie_id = movie_data.get('movie_id')
        if not movie_id or str(movie_id).strip() == '': return jsonify({"error": "Movie ID is required"}), 400
        if 'collection' not in session: session['collection'] = []
        if not any(str(m['movie_id']) == str(movie_id) for m in session['collection']):
            movie_data['genres'] = list(movie_data.get('genres', []))
            session['collection'].append(movie_data)
            session.modified = True
            return jsonify({"message": f"Movie '{movie_data.get('title')}' added to collection."}), 200
        else: return jsonify({"message": f"Movie '{movie_data.get('title')}' is already in collection."}), 200
    except Exception as e: return jsonify({"error": f"An unexpected server error occurred: {str(e)}"}), 500

@app.route('/remove_from_collection', methods=['POST'])
def remove_from_collection():
    try:
        movie_data = request.get_json()
        movie_id_to_remove = movie_data.get('movie_id')
        if not movie_id_to_remove: return jsonify({"error": "Movie ID is required for removal"}), 400
        if 'collection' not in session: return jsonify({"message": "Collection is empty."}), 200
        initial_len = len(session['collection'])
        session['collection'] = [m for m in session['collection'] if str(m['movie_id']) != str(movie_id_to_remove)]
        if len(session['collection']) < initial_len:
            session.modified = True
            return jsonify({"message": "Movie removed from collection."}), 200
        else: return jsonify({"message": "Movie not found in collection."}), 200
    except Exception as e: return jsonify({"error": f"An unexpected server error occurred during removal: {str(e)}"}), 500

@app.route('/get_collection')
def get_collection():
    if 'collection' not in session: session['collection'] = []
    collection_data = session['collection'][:]
    for movie in collection_data:
        if isinstance(movie.get('genres'), str):
            try:
                movie['genres'] = json.loads(movie['genres'])
            except json.JSONDecodeError:
                movie['genres'] = []
        elif not isinstance(movie.get('genres'), list):
            movie['genres'] = []
    return jsonify({"collection": collection_data}), 200

@app.route('/')
def home():
    return send_from_directory(app.static_folder, 'index.html')

# Serve front-end for client-side routes (e.g., /movie/123)
@app.errorhandler(404)
def spa_fallback(_):
    try:
        return send_from_directory(app.static_folder, 'index.html')
    except Exception:
        return jsonify({'error': 'Not found'}), 404

@app.route('/recommend', methods=['POST'])
def get_recommendations():
    try:
        data = request.get_json()
        title = data.get('title')
        if not title:
            return jsonify({"error": "Movie title is required"}), 400
        
        recommendations = recommend(title)
        return jsonify({"recommendations": recommendations}), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/get_movies_by_genre', methods=['POST'])
def get_movies_by_genre():
    global df
    if df is None: df, _ = load_and_preprocess_data()
    data = request.get_json()
    genre = data.get('genre')
    if not genre: return jsonify({"error": "Genre is required"}), 400
    g = str(genre).strip().lower()
    genre_movies = df[df['tmdb_genres'].apply(lambda gs: isinstance(gs, list) and any(isinstance(x, str) and x.lower() == g for x in gs))]
    genre_movies = genre_movies[genre_movies['tmdb_vote_count'].notna() & (genre_movies['tmdb_vote_count'] >= 10)]
    formatted_movies = []
    genre_movies_list_of_dicts = genre_movies.sort_values(by=['tmdb_vote_average', 'tmdb_vote_count'], ascending=[False, False]).to_dict('records')
    for movie in genre_movies_list_of_dicts:
        poster_url = f"{TMDB_IMAGE_BASE_URL}{movie['tmdb_poster_path']}" if pd.notna(movie['tmdb_poster_path']) else PLACEHOLDER_IMAGE_URL
        formatted_movies.append({
            'movie_id': int(movie['movie_id']), 'title': movie['title'], 'poster_url': poster_url,
            'year': movie['tmdb_year'], 'genres': movie['tmdb_genres'],
            'vote_average': float(movie['tmdb_vote_average']) if pd.notna(movie['tmdb_vote_average']) else None,
            'language': movie['tmdb_original_language'].upper() if pd.notna(movie['tmdb_original_language']) else 'N/A',
            'cast': (movie['cast'][:3] if isinstance(movie.get('cast'), list) else []),
            'directors': (movie['crew'] if isinstance(movie.get('crew'), list) else [])
        })
    return jsonify({"movies": formatted_movies, "genre": genre})

@app.route('/get_movies_by_person', methods=['POST'])
def get_movies_by_person():
    global df
    if df is None: df, _ = load_and_preprocess_data()
    data = request.get_json()
    name = data.get('name')
    role = data.get('role')  # 'cast' or 'director'
    if not name or not role:
        return jsonify({"error": "Both 'name' and 'role' are required"}), 400
    n = str(name).strip().lower()
    role = role.strip().lower()

    if role == 'cast':
        person_movies = df[df['cast'].apply(lambda lst: isinstance(lst, list) and any(isinstance(x, str) and x.lower() == n for x in lst))]
    elif role == 'director':
        person_movies = df[df['crew'].apply(lambda lst: isinstance(lst, list) and any(isinstance(x, str) and x.lower() == n for x in lst))]
    else:
        return jsonify({"error": "Invalid role. Use 'cast' or 'director'"}), 400

    person_movies = person_movies[person_movies['tmdb_vote_count'].notna() & (person_movies['tmdb_vote_count'] >= 10)]
    formatted = []
    movies_list = person_movies.sort_values(by=['tmdb_vote_average', 'tmdb_vote_count'], ascending=[False, False]).to_dict('records')
    for movie in movies_list:
        poster_url = f"{TMDB_IMAGE_BASE_URL}{movie['tmdb_poster_path']}" if pd.notna(movie['tmdb_poster_path']) else PLACEHOLDER_IMAGE_URL
        formatted.append({
            'movie_id': int(movie['movie_id']), 'title': movie['title'], 'poster_url': poster_url,
            'year': movie['tmdb_year'], 'genres': movie['tmdb_genres'],
            'vote_average': float(movie['tmdb_vote_average']) if pd.notna(movie['tmdb_vote_average']) else None,
            'language': movie['tmdb_original_language'].upper() if pd.notna(movie['tmdb_original_language']) else 'N/A',
            'cast': (movie.get('cast')[:3] if isinstance(movie.get('cast'), list) else []),
            'directors': (movie.get('crew') if isinstance(movie.get('crew'), list) else [])
        })
    return jsonify({"movies": formatted, "person": name, "role": role})

@app.route('/search_suggestions', methods=['GET'])
def search_suggestions_route():
    global df
    if df is None: df, _ = load_and_preprocess_data()
    query = request.args.get('q', '').lower()
    if not query: return jsonify([])
    matching_titles = df[df['title'].str.lower().str.contains(query)]['title'].unique().tolist()
    suggestions = sorted(matching_titles)[:10]
    return jsonify(suggestions)

@app.route('/sample_posters')
def sample_posters():
    global df
    if df is None:
        df, _ = load_and_preprocess_data()
    try:
        limit = int(request.args.get('limit', 60))
    except Exception:
        limit = 60
    available = df[df['tmdb_poster_path'].notna()]
    if available.empty:
        return jsonify({'posters': []})
    sample = available.sample(n=min(limit, len(available)), random_state=None)
    posters = [
        f"{TMDB_IMAGE_BASE_URL}{p}" if pd.notna(p) else PLACEHOLDER_IMAGE_URL
        for p in sample['tmdb_poster_path']
    ]
    return jsonify({'posters': posters})

@app.route('/movie_overview', methods=['POST'])
def movie_overview():
    global df
    if df is None:
        df, _ = load_and_preprocess_data()
    data = request.get_json()
    movie_id = data.get('movie_id')
    title = data.get('title')
    row = None
    if movie_id is not None:
        try:
            row = df[df['movie_id'] == int(movie_id)]
        except Exception:
            row = df[df['movie_id'].astype(str) == str(movie_id)]
    elif title:
        t = str(title).strip().lower()
        row = df[df['title'].str.lower().str.strip() == t]
    if row is not None and not row.empty:
        overview = row.iloc[0].get('overview_text', '')
        return jsonify({'overview': overview or ''}), 200
    return jsonify({'overview': ''}), 200

@app.route('/movie_details')
def movie_details():
    global df
    if df is None:
        df, _ = load_and_preprocess_data()

    movie_id = request.args.get('movie_id')
    title = request.args.get('title')

    tmdb_id = None
    if movie_id:
        try:
            tmdb_id = int(movie_id)
        except Exception:
            tmdb_id = None

    if tmdb_id is None and title:
        t = str(title).strip().lower()
        row = df[df['title'].str.lower().str.strip() == t]
        if not row.empty:
            try:
                tmdb_id = int(row.iloc[0]['movie_id'])
            except Exception:
                pass

    if tmdb_id is None:
        return jsonify({'error': 'movie_id or title is required'}), 400

    url = f"{TMDB_BASE_URL}/movie/{tmdb_id}?api_key={TMDB_API_KEY}&language=en-US&append_to_response=credits,reviews"
    try:
        resp = requests_session.get(url, timeout=12)
        resp.raise_for_status()
        data = resp.json()

        poster_path = data.get('poster_path')
        backdrop_path = data.get('backdrop_path')
        release_date = data.get('release_date')
        year = release_date.split('-')[0] if release_date else 'Unknown'
        genres = [g.get('name') for g in (data.get('genres') or [])]
        runtime = data.get('runtime')
        vote_average = data.get('vote_average')
        vote_count = data.get('vote_count')
        original_language = (data.get('original_language') or 'N/A').upper()
        homepage = data.get('homepage')
        overview = data.get('overview') or ''

        credits = data.get('credits') or {}
        cast_list = credits.get('cast') or []
        crew_list = credits.get('crew') or []
        directors = [m.get('name') for m in crew_list if isinstance(m, dict) and m.get('job') == 'Director']
        top_cast = []
        for c in cast_list[:12]:
            if not isinstance(c, dict):
                continue
            top_cast.append({
                'id': c.get('id'),
                'name': c.get('name'),
                'character': c.get('character'),
                'profile_url': f"{TMDB_IMAGE_BASE_URL}{c.get('profile_path')}" if c.get('profile_path') else None
            })

        reviews_data = data.get('reviews') or {}
        reviews = []
        for r in (reviews_data.get('results') or [])[:10]:
            if not isinstance(r, dict):
                continue
            author_details = r.get('author_details') or {}
            reviews.append({
                'author': r.get('author'),
                'content': r.get('content'),
                'created_at': r.get('created_at'),
                'url': r.get('url'),
                'rating': author_details.get('rating')
            })

        poster_url = f"{TMDB_IMAGE_BASE_URL}{poster_path}" if poster_path else PLACEHOLDER_IMAGE_URL
        backdrop_url = f"{TMDB_IMAGE_BASE_URL}{backdrop_path}" if backdrop_path else None

        if not overview:
            try:
                row = df[df['movie_id'] == int(tmdb_id)]
                if not row.empty:
                    overview = row.iloc[0].get('overview_text', '') or ''
            except Exception:
                pass

        return jsonify({
            'movie_id': tmdb_id,
            'title': data.get('title'),
            'poster_url': poster_url,
            'backdrop_url': backdrop_url,
            'year': year,
            'genres': genres,
            'runtime': runtime,
            'vote_average': vote_average,
            'vote_count': vote_count,
            'language': original_language,
            'homepage': homepage,
            'overview': overview,
            'cast': top_cast,
            'directors': directors,
            'reviews': reviews
        }), 200
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to fetch details: {str(e)}'}), 500

if __name__ == '__main__':
    os.makedirs(data_dir, exist_ok=True)
    if not os.path.exists(movies_csv_path) or not os.path.exists(credits_csv_path):
        print(f"Error: Raw CSV files not found in '{data_dir}/'. Please ensure 'tmdb_5000_movies.csv' and 'tmdb_5000_credits.csv' are present.")
        exit()
    df, similarity = load_and_preprocess_data()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)