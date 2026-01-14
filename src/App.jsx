import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import MovieDetail from './pages/MovieDetail';
import Recommendations from './pages/Recommendations';
import SplashScreen from './components/SplashScreen';
import AnimatedList from './components/AnimatedList';
import SkeletonLoader from './components/SkeletonLoader';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [topWatchedMovies, setTopWatchedMovies] = useState([]);
  const [myCurrentCollection, setMyCurrentCollection] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [moodMovies, setMoodMovies] = useState([]);
  const [moodSectionTitle, setMoodSectionTitle] = useState("What's Your Mood?");
  const [loading, setLoading] = useState({ topWatched: false, collection: false, recommendations: false, mood: false });
  const [error, setError] = useState({ topWatched: null, collection: null, recommendations: null, mood: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [moodText, setMoodText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [splashTopPosters, setSplashTopPosters] = useState([]);
  // Search suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const recommendationsSectionRef = useRef(null);
  const moodSectionRef = useRef(null);
  const searchInputRef = useRef(null);
  const [toast, setToast] = useState({ show: false, message: '' });
  // Track active selections to allow deselect/toggle
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const moodCategories = ['Happy', 'Romcom', 'Horror', 'Action/Adventure', 'Intense/Mystery'];

  // Inappropriate/adult term filtering (basic blacklist)
  const inappropriatePatterns = [
    /\bsex\b/i,
    /\bporn\b/i,
    /\bnude\b/i,
    /\berotic\b/i,
    /\bxxx\b/i,
    /\badult\b/i,
    /\bnsfw\b/i,
    /\bfetish\b/i
  ];
  const isInappropriate = (txt) => {
    if (!txt) return false;
    return inappropriatePatterns.some((re) => re.test(String(txt)));
  };

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  const fetchMoviesByCategory = (category) => {
    closeSidebar();
    // Toggle: deselect if clicking the same category
    if (selectedCategory === category) {
      setSelectedCategory(null);
      setMoodMovies([]);
      setMoodSectionTitle("What's Your Mood?");
      return;
    }
    setSelectedCategory(category);
    setSelectedGenre(null);

    setMoodSectionTitle(`Movies matching "${category}" mood`);
    setLoading(prev => ({ ...prev, mood: true }));
    setError(prev => ({ ...prev, mood: null }));

    fetch('/get_movies_by_mood_category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setMoodMovies(data.movies);
        setLoading(prev => ({ ...prev, mood: false }));
        if (moodSectionRef && moodSectionRef.current) {
          moodSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      })
      .catch(err => {
        setError(prev => ({ ...prev, mood: err.message }));
        setLoading(prev => ({ ...prev, mood: false }));
        console.error(`Error fetching movies for category "${category}":`, err);
      });
  };

  const fetchTopWatchedMovies = () => {
    setLoading(prev => ({ ...prev, topWatched: true }));
    setError(prev => ({ ...prev, topWatched: null }));

    fetch('/top_watched')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setTopWatchedMovies(data.movies);
        setLoading(prev => ({ ...prev, topWatched: false }));
      })
      .catch(err => {
        setError(prev => ({ ...prev, topWatched: err.message }));
        setLoading(prev => ({ ...prev, topWatched: false }));
        console.error('Error fetching top watched movies:', err);
      });
  };

  const fetchMyCollection = () => {
    setLoading(prev => ({ ...prev, collection: true }));
    setError(prev => ({ ...prev, collection: null }));

    fetch('/get_collection')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setMyCurrentCollection(data.collection);
        setLoading(prev => ({ ...prev, collection: false }));
      })
      .catch(err => {
        setError(prev => ({ ...prev, collection: err.message }));
        setLoading(prev => ({ ...prev, collection: false }));
        console.error('Error fetching collection:', err);
      });
  };

  const fetchRecommendations = (movieName) => {
    const q = movieName && movieName.trim();
    if (!q) {
      setError(prev => ({ ...prev, recommendations: 'Please enter a movie title' }));
      return;
    }
    if (isInappropriate(q)) {
      setError(prev => ({ ...prev, recommendations: 'Inappropriate search term blocked.' }));
      return;
    }
    // Navigate to dedicated recommendations page
    setShowSplash(false);
    navigate(`/recommendations?title=${encodeURIComponent(q)}`, { state: { title: q } });
  };

  const fetchMoviesFromMoodText = (text) => {
    if (!text || text.trim() === '') {
      setError(prev => ({ ...prev, mood: 'Please describe your mood' }));
      return;
    }
    if (isInappropriate(text)) {
      setError(prev => ({ ...prev, mood: 'Inappropriate content blocked.' }));
      return;
    }
    setMoodSectionTitle(`Movies matching your mood: "${text}"`);
    setLoading(prev => ({ ...prev, mood: true }));
    setError(prev => ({ ...prev, mood: null }));

    fetch('/moodwise_text_input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setMoodMovies(data.movies);
        setLoading(prev => ({ ...prev, mood: false }));
        if (moodSectionRef && moodSectionRef.current) {
          moodSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      })
      .catch(err => {
        setError(prev => ({ ...prev, mood: err.message }));
        setLoading(prev => ({ ...prev, mood: false }));
        console.error('Error fetching mood movies:', err);
      });
  };

  // Fetch by genre for clickable genre tags
  const fetchMoviesByGenre = (genre) => {
    if (!genre) return;
    
    // Always navigate to home and reset splash
    setShowSplash(false);
    navigate('/', { state: { genre } });
    
    setSelectedGenre(genre);
    setSelectedCategory(null);

    setMoodSectionTitle(`Genre: ${genre}`);
    setLoading(prev => ({ ...prev, mood: true }));
    setError(prev => ({ ...prev, mood: null }));

    fetch('/get_movies_by_genre', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genre }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setMoodMovies(data.movies);
        setLoading(prev => ({ ...prev, mood: false }));
        if (moodSectionRef && moodSectionRef.current) {
          moodSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      })
      .catch(err => {
        setError(prev => ({ ...prev, mood: err.message }));
        setLoading(prev => ({ ...prev, mood: false }));
        console.error('Error fetching movies by genre:', err);
      });
  };

  
  // Fetch by person for clickable cast/director
  const fetchMoviesByPerson = (role, name) => {
    if (!role || !name) return;
    const title = role === 'director' ? `Directed by ${name}` : `Featuring ${name}`;
    setMoodSectionTitle(title);
    setLoading(prev => ({ ...prev, mood: true }));
    setError(prev => ({ ...prev, mood: null }));

    fetch('/get_movies_by_person', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, name }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setMoodMovies(data.movies);
        setLoading(prev => ({ ...prev, mood: false }));
        if (moodSectionRef && moodSectionRef.current) {
          moodSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      })
      .catch(err => {
        setError(prev => ({ ...prev, mood: err.message }));
        setLoading(prev => ({ ...prev, mood: false }));
        console.error('Error fetching movies by person:', err);
      });
  };

  // Helpers for formatting names
  const capitalizeWords = (s) => (s || '').replace(/\b\w/g, ch => ch.toUpperCase());
  const formatPersonName = (name) => {
    if (!name) return '';
    if (String(name).includes(' ')) return capitalizeWords(name);
    const n = String(name).toLowerCase();
    const mid = Math.floor(n.length / 2);
    const vowels = 'aeiou';
    let splitIdx = -1;
    for (let i = mid; i < n.length - 1; i++) {
      if (vowels.includes(n[i]) && !vowels.includes(n[i + 1])) {
        splitIdx = i + 1; break;
      }
    }
    if (splitIdx === -1) splitIdx = mid;
    const first = n.slice(0, splitIdx);
    const second = n.slice(splitIdx);
    return `${capitalizeWords(first)} ${capitalizeWords(second)}`;
  };

  // Handlers for search suggestions
  const handleSearchInputChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val || val.trim() === '') {
      setSuggestions([]);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      return;
    }
    if (isInappropriate(val)) {
      setSuggestions([]);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      setError(prev => ({ ...prev, recommendations: 'Inappropriate search term blocked.' }));
      return;
    }
    fetch(`/search_suggestions?q=${encodeURIComponent(val)}`)
      .then(res => res.ok ? res.json() : [])
      .then(list => {
        setSuggestions(Array.isArray(list) ? list : []);
        setShowSuggestions(Array.isArray(list) && list.length > 0);
        setHighlightedIndex(-1);
      })
      .catch(() => {
        setSuggestions([]);
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      });
  };

  const handleSearchKeyDown = (e) => {
    if (!showSuggestions && e.key === 'Enter') {
      e.preventDefault();
      fetchRecommendations(searchQuery);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => {
        const next = Math.min(prev + 1, suggestions.length - 1);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = highlightedIndex >= 0 ? suggestions[highlightedIndex] : searchQuery;
      setShowSuggestions(false);
      fetchRecommendations(chosen);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleAddToCollection = (movie) => {
    const movieExists = myCurrentCollection.some(m => String(m.movie_id) === String(movie.movie_id));
    if (movieExists) {
      alert('This movie is already in your collection!');
      return;
    }
    setMyCurrentCollection(prev => [...prev, movie]);

    fetch('/add_to_collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(movie),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to add movie to collection`);
        }
        return response.json();
      })
      .catch(err => {
        setMyCurrentCollection(prev => prev.filter(m => String(m.movie_id) !== String(movie.movie_id)));
        console.error('Error adding to collection:', err);
        alert('Failed to add movie to collection. Please try again.');
      });
  };

  const handleRemoveFromCollection = (movieId) => {
    // Remove immediately without blocking alert; show a toast instead
    setMyCurrentCollection(prev => prev.filter(m => String(m.movie_id) !== String(movieId)));
    fetch('/remove_from_collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movie_id: movieId }),
    })
      .then(() => {
        setToast({ show: true, message: 'Removed from collection' });
        setTimeout(() => setToast({ show: false, message: '' }), 2000);
      })
      .catch(err => {
        console.error('Error removing from collection:', err);
        fetchMyCollection();
        setToast({ show: true, message: 'Failed to remove. Refreshed collection.' });
        setTimeout(() => setToast({ show: false, message: '' }), 2500);
      });
  };

  useEffect(() => {
    fetchMyCollection();
    fetchTopWatchedMovies();
  }, []);

  // Fetch posters for splash slanted rows
  useEffect(() => {
    if (!showSplash) return;
    fetch('/sample_posters?limit=120')
      .then(res => res.ok ? res.json() : { posters: [] })
      .then(data => {
        const posters = Array.isArray(data.posters) ? data.posters.filter(p => !!p && !p.includes('placehold.co')) : [];
        setSplashTopPosters(posters);
      })
      .catch(() => setSplashTopPosters([]));
  }, [showSplash]);

    
  const MovieCard = React.memo(({ movie, isCollectionCard }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [overview, setOverview] = useState(movie.overview || '');
    const hoverTimeoutRef = useRef(null);
    const leaveTimeoutRef = useRef(null);

    const handleMouseEnter = () => {
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
        leaveTimeoutRef.current = null;
      }
      
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovered(true);
        if (!overview) {
          fetch('/movie_overview', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movie_id: movie.movie_id, title: movie.title })
          })
            .then(res => res.ok ? res.json() : { overview: '' })
            .then(data => setOverview(data.overview || ''))
            .catch(() => {});
        }
      }, 300);
    };

    const handleMouseLeave = () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      
      leaveTimeoutRef.current = setTimeout(() => {
        setIsHovered(false);
      }, 200);
    };

    const genresArray = Array.isArray(movie.genres) ? movie.genres : [];
    const castArray = Array.isArray(movie.cast) ? movie.cast : [];
    const directorsArray = Array.isArray(movie.directors) ? movie.directors : [];
    const voteAverage = parseFloat(movie.vote_average);
    const movieId = String(movie.movie_id);
    const isAdded = myCurrentCollection.some(m => String(m.movie_id) === movieId);

    const formatLanguage = (code) => {
      const languageMap = { 'EN': 'English', 'JA': 'Japanese', 'FR': 'French', 'ES': 'Spanish', 'DE': 'German', 'IT': 'Italian', 'KO': 'Korean', 'ZH': 'Chinese', 'RU': 'Russian', 'HI': 'Hindi' };
      return languageMap[code] || code;
    };

    return (
      <motion.div 
        className="movie-card-container" 
        onMouseEnter={handleMouseEnter} 
        onMouseLeave={handleMouseLeave}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ position: 'relative' }}
      >
        <motion.div
          className="movie-card"
          onClick={() => { setShowSplash(false); navigate(`/movie/${movie.movie_id}`, { state: { title: movie.title } }); }}
          animate={{
            scale: isHovered ? 1.05 : 1,
            zIndex: isHovered ? 100 : 1
          }}
          transition={{ 
            scale: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] },
            zIndex: { duration: 0 }
          }}
          whileTap={{ scale: 0.98 }}
          style={{ cursor: 'pointer', position: 'relative' }}
          role="button"
          tabIndex={0}
          aria-label={`View details for ${movie.title}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate(`/movie/${movieId}`);
            }
          }}
        >
          <img
            src={movie.poster_url || 'https://placehold.co/200x300/333/999?text=No+Poster'}
            alt={`${movie.title} poster`}
            style={{ display: 'block' }}
            loading="lazy"
            onError={(e) => { 
              if (e.target.src !== 'https://placehold.co/200x300/333/999?text=No+Poster') {
                e.target.src = 'https://placehold.co/200x300/333/999?text=No+Poster';
              }
            }}
          />

          {voteAverage ? (
            <motion.div 
              className="rating-overlay"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              aria-label={`Rating: ${voteAverage.toFixed(1)} out of 10`}
            >
              <i className="fas fa-star"></i>
              {voteAverage.toFixed(1)}
            </motion.div>
          ) : null}

          <motion.div 
            className="movie-card-info"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <h3>{movie.title}</h3>
            <p className="movie-year">{movie.year || 'Year not available'}</p>
          </motion.div>

          <AnimatePresence>
            {isHovered && (
              <motion.div 
                className="floating-actions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                {!isCollectionCard ? (
                  <motion.button
                    className={`add-to-collection-btn ${isAdded ? 'added' : ''}`}
                    disabled={isAdded}
                    onClick={(e) => { e.stopPropagation(); handleAddToCollection(movie); }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isAdded ? '✓ Added' : '+ Add to Collection'}
                  </motion.button>
                ) : (
                  <motion.button
                    className="remove-from-collection-btn"
                    onClick={(e) => { e.stopPropagation(); handleRemoveFromCollection(movieId); }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Remove from Collection
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isHovered && (
              <motion.div
                className="movie-flyout"
                initial={{ opacity: 0, x: 10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 10, scale: 0.95 }}
                transition={{ 
                  duration: 0.25, 
                  ease: [0.16, 1, 0.3, 1]
                }}
                style={{ 
                  position: 'absolute',
                  zIndex: 200
                }}
              >
              <div className="panel-section">
                <p><strong>Overview:</strong></p>
                <div style={{ fontSize: '0.9em', color: '#cfd3d7' }}>
                  {overview ? overview : 'No summary available.'}
                </div>
              </div>
              <div className="panel-section">
                <p><strong>Genres:</strong></p>
                <div className="genre-tags">
                  {genresArray.length > 0 ? (
                    genresArray.map(g => (
                      <span
                        key={`fly-g-${g}`}
                        className="genre-tag"
                        onClick={(e) => { e.stopPropagation(); fetchMoviesByGenre(g); }}
                      >
                        {g}
                      </span>
                    ))
                  ) : (
                    <span>N/A</span>
                  )}
                </div>
              </div>
              <div className="panel-section">
                <p><strong>Cast:</strong></p>
                <div className="genre-tags">
                  {castArray.length > 0 ? (
                    castArray.map(c => (
                      <span
                        key={`fly-c-${c}`}
                        className="genre-tag name-tag"
                        onClick={(e) => { e.stopPropagation(); fetchMoviesByPerson('cast', c); }}
                      >
                        {formatPersonName(c)}
                      </span>
                    ))
                  ) : (
                    <span>N/A</span>
                  )}
                </div>
              </div>
              <div className="panel-section">
                <p><strong>Director:</strong></p>
                <div className="genre-tags">
                  {directorsArray.length > 0 ? (
                    directorsArray.map(d => (
                      <span
                        key={`fly-d-${d}`}
                        className="genre-tag name-tag"
                        onClick={(e) => { e.stopPropagation(); fetchMoviesByPerson('director', d); }}
                      >
                        {formatPersonName(d)}
                      </span>
                    ))
                  ) : (
                    <span>N/A</span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          <div className={`movie-details-box`} style={{ display: 'none' }}>
            <div className="details-content">
              <h3>{movie.title}</h3>
              <p><strong>Year:</strong> {movie.year || 'N/A'}</p>
              <div className="genre-tags">
                {genresArray.length > 0 ? (
                  genresArray.map(g => (
                    <span key={g} className="genre-tag" onClick={(e) => { e.stopPropagation(); fetchMoviesByGenre(g); }}>
                      {g}
                    </span>
                  ))
                ) : (
                  <span>N/A</span>
                )}
              </div>
              <p><strong>Cast:</strong></p>
              <div className="genre-tags">
                {castArray.length > 0 ? (
                  castArray.map(c => (
                    <span key={`cast-${c}`} className="genre-tag name-tag" onClick={(e) => { e.stopPropagation(); fetchMoviesByPerson('cast', c); }}>
                      {c}
                    </span>
                  ))
                ) : (
                  <span>N/A</span>
                )}
              </div>
              <p><strong>Director:</strong></p>
              <div className="genre-tags">
                {directorsArray.length > 0 ? (
                  directorsArray.map(d => (
                    <span key={`dir-${d}`} className="genre-tag name-tag" onClick={(e) => { e.stopPropagation(); fetchMoviesByPerson('director', d); }}>
                      {d}
                    </span>
                  ))
                ) : (
                  <span>N/A</span>
                )}
              </div>
              <p><strong>Language:</strong> {formatLanguage(movie.language) || 'N/A'}</p>
              <div className="action-buttons">
                {!isCollectionCard ? (
                  <button
                    className={`add-to-collection-btn ${isAdded ? 'added' : ''}`}
                    disabled={isAdded}
                    onClick={(e) => { e.stopPropagation(); handleAddToCollection(movie); }}
                  >
                    {isAdded ? '✓ Added' : '+ Add to Collection'}
                  </button>
                ) : (
                  <button className="remove-from-collection-btn" onClick={(e) => { e.stopPropagation(); handleRemoveFromCollection(movieId); }}>
                    Remove from Collection
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }, (prevProps, nextProps) => {
    // Only re-render if movie data or collection status actually changed
    return prevProps.movie.movie_id === nextProps.movie.movie_id && 
           prevProps.isCollectionCard === nextProps.isCollectionCard;
  });

  const renderMovieCard = React.useCallback((movie) => (
    <MovieCard movie={movie} isCollectionCard={false} />
  ), []);

  const renderCollectionCard = React.useCallback((movie) => (
    <MovieCard movie={movie} isCollectionCard={true} />
  ), []);

  const renderMovieList = (movies, isLoading, errorMsg) => {
    if (isLoading) return <SkeletonLoader count={6} />;
    if (errorMsg) return <div className="error">{errorMsg}</div>;
    if (!movies || movies.length === 0) return <div className="no-results">No movies found</div>;
    return (
      <div className="movies-grid">
        <AnimatedList
          items={movies}
          renderItem={renderMovieCard}
          staggerDelay={0.03}
          displayScrollbar={false}
        />
      </div>
    );
  };

  const renderCollectionList = (movies, isLoading, errorMsg) => {
    if (isLoading) return <SkeletonLoader count={6} />;
    if (errorMsg) return <div className="error">{errorMsg}</div>;
    if (!movies || movies.length === 0) return <div className="no-results">Your collection is empty</div>;
    return (
      <div className="netflix-style-row">
        <AnimatedList
          items={movies}
          renderItem={renderCollectionCard}
          staggerDelay={0.04}
          displayScrollbar={false}
        />
      </div>
    );
  };

  if (showSplash && location.pathname === '/') {
    return (
      <SplashScreen
        moodText={moodText}
        setMoodText={setMoodText}
        setShowSplash={setShowSplash}
        fetchMoviesFromMoodText={fetchMoviesFromMoodText}
        splashTopPosters={splashTopPosters}
      />
    );
  }

  return (
    <div className="App">
      {location.pathname === '/' && (
        <motion.aside 
          className={`sidebar ${sidebarOpen ? 'open' : ''}`}
          initial={{ x: -280 }}
          animate={{ x: sidebarOpen ? 0 : -280 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <div className="sidebar-header">
            {sidebarOpen && <i className="fas fa-bars menu-icon" onClick={toggleSidebar}></i>}
            Moods & Genres
          </div>
          <motion.div 
            className="moodsListContainer"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.05
                }
              }
            }}
          >
            {moodCategories.map((category, index) => (
              <motion.button
                key={category}
                className="mood-category-btn"
                onClick={() => fetchMoviesByCategory(category)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                whileHover={{ scale: 1.05, x: 10, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.95 }}
              >
                {category}
              </motion.button>
            ))}
          </motion.div>
        </motion.aside>
      )}

      <main className={location.pathname === '/' && sidebarOpen ? 'sidebar-open' : ''}>
        <header>
          <div className="header-left">
            {location.pathname === '/' && !sidebarOpen && <i className="fas fa-bars menu-icon" onClick={toggleSidebar}></i>}
            {showSplash ? (
              <i className="fas fa-home home-icon" onClick={() => setShowSplash(false)} title="Browse Movies"></i>
            ) : location.pathname !== '/' && (
              <i className="fas fa-home home-icon" onClick={() => { navigate('/'); }} title="Home"></i>
            )}
            <span className="logo home-btn" onClick={() => { setShowSplash(!showSplash); navigate('/'); }} style={{ cursor: 'pointer' }}>
              <span className="logo-cine">Cine</span> <span className="logo-match">Match</span>
            </span>
          </div>
          <div className="search-container">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={handleSearchInputChange}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => setShowSuggestions(suggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            />
            <span
              className="search-icon"
              onClick={() => {
                if (searchQuery.trim()) {
                  setShowSuggestions(false);
                  fetchRecommendations(searchQuery);
                } else {
                  searchInputRef.current?.focus();
                }
              }}
            >
              🔍
            </span>
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.ul 
                  className="suggestions-dropdown"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {suggestions.map((s, idx) => (
                    <motion.li
                      key={s}
                      className={`suggestion-item ${idx === highlightedIndex ? 'highlighted' : ''}`}
                      onMouseDown={() => { setSearchQuery(s); setShowSuggestions(false); fetchRecommendations(s); }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.2 }}
                      whileHover={{ backgroundColor: "rgba(255,255,255,0.15)", x: 5 }}
                    >
                    {s}
                  </motion.li>
                ))}
              </motion.ul>
              )}
            </AnimatePresence>
          </div>
        </header>

        {false && (
          <aside className="side-details-panel"></aside>
        )}

        {location.pathname === '/' && (
          <>
            <motion.section 
              className="container"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <motion.h2 
                className="section-title"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              >
                Top Watched
              </motion.h2>
              {renderMovieList(topWatchedMovies, loading.topWatched, error.topWatched)}
            </motion.section>

            <motion.section 
              ref={moodSectionRef} 
              className="container mood-selector-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <motion.h2 
                id="moodSectionTitle"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              >
                {moodSectionTitle}
              </motion.h2>
              <motion.div 
                className="mood-input-group"
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <input
                  type="text"
                  id="moodTextInput"
                  placeholder="e.g., 'I had a tough day, need a laugh' or 'Something thrilling'"
                  value={moodText}
                  onChange={e => setMoodText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchMoviesFromMoodText(moodText)}
                />
                <motion.button 
                  onClick={() => fetchMoviesFromMoodText(moodText)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Go
                </motion.button>
              </motion.div>
              {renderMovieList(moodMovies, loading.mood, error.mood)}
            </motion.section>

            <motion.section 
              className="container"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <motion.h2 
                className="section-title"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              >
                My Collection
              </motion.h2>
              {renderCollectionList(myCurrentCollection, loading.collection, error.collection)}
            </motion.section>

            </>
        )}

        {location.pathname.startsWith('/movie/') && (
          <div className="container" style={{ paddingTop: 20 }}>
            <MovieDetail />
          </div>
        )}

        {location.pathname.startsWith('/recommendations') && (
          <div className="container" style={{ paddingTop: 20 }}>
            <Recommendations />
          </div>
        )}
      </main>

      <AnimatePresence>
        {toast.show && (
          <motion.div 
            className="toast"
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.8 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <footer>
        <div className="container">
          <p>&copy; 2025 CineMatch. All rights reserved. Data provided by <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">TMDb</a>.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
