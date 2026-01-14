import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function Recommendations() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recs, setRecs] = useState([]);

  const params = new URLSearchParams(location.search);
  const titleFromQuery = params.get('title');
  const titleFromState = location.state && location.state.title;
  const genreFromQuery = params.get('genre');
  const genreFromState = location.state && location.state.genre;
  const roleFromQuery = params.get('role');
  const roleFromState = location.state && location.state.role;
  const nameFromQuery = params.get('name');
  const nameFromState = location.state && location.state.name;
  const title = titleFromQuery || titleFromState || '';
  const genre = genreFromQuery || genreFromState || '';
  const role = (roleFromQuery || roleFromState || '').toLowerCase();
  const personName = nameFromQuery || nameFromState || '';

  useEffect(() => {
    let ignore = false;
    const hasGenre = !!genre;
    const hasTitle = !!title;
    const hasPerson = !!role && !!personName;

    if (!hasGenre && !hasTitle && !hasPerson) {
      setError('No query provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fetcher = hasGenre
      ? fetch('/get_movies_by_genre', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ genre })
        })
      : hasPerson
      ? fetch('/get_movies_by_person', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, name: personName })
        })
      : fetch('/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title })
        });

    fetcher
      .then(res => {
        if (!res.ok) return res.json().then(err => { throw new Error(err.error || `HTTP ${res.status}`); });
        return res.json();
      })
      .then(data => {
        if (!ignore) {
          const list = hasGenre
            ? (Array.isArray(data.movies) ? data.movies : [])
            : hasPerson
            ? (Array.isArray(data.movies) ? data.movies : [])
            : (Array.isArray(data.recommendations) ? data.recommendations : []);
          setRecs(list);
          setLoading(false);
        }
      })
      .catch(e => { if (!ignore) { setError(e.message || 'Failed to fetch'); setLoading(false); } });

    return () => { ignore = true; };
  }, [title, genre, role, personName]);

  if (loading) return <div className="container"><h2 className="section-title">Recommended Titles</h2><div className="loading">Loading...</div></div>;
  if (error) return <div className="container"><h2 className="section-title">Recommended Titles</h2><div className="error">{error}</div></div>;

  return (
    <div className="container">
      <h2 className="section-title" style={{ marginTop: 0 }}>
        {genre
          ? `Genre: ${genre}`
          : role && personName
          ? `${role === 'director' ? 'Directed by' : 'Featuring'} ${personName}`
          : `Recommended for "${title}"`}
      </h2>
      {(!recs || recs.length === 0) ? (
        <div className="no-results">No results found.</div>
      ) : (
        <div className="movies-grid rec-grid">
          {recs.map((m) => (
            <RecCard key={m.movie_id} movie={m} onClick={() => navigate(`/movie/${m.movie_id}`, { state: { title: m.title } })} />
          ))}
        </div>
      )}
    </div>
  );
}

function RecCard({ movie, onClick }) {
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
  const voteAverage = movie.vote_average != null ? Number(movie.vote_average) : null;

  return (
    <motion.div 
      className="movie-card-container" 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave} 
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ position: 'relative' }}
    >
      <motion.div 
        className="movie-card"
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
      >
        <img
          src={movie.poster_url || 'https://placehold.co/200x300/333/999?text=No+Poster'}
          alt={`${movie.title} poster`}
          loading="lazy"
          onError={(e) => { 
            if (e.currentTarget.src !== 'https://placehold.co/200x300/333/999?text=No+Poster') {
              e.currentTarget.src = 'https://placehold.co/200x300/333/999?text=No+Poster';
            }
          }}
        />

        {voteAverage ? (
          <div className="rating-overlay">
            <i className="fas fa-star"></i>
            {voteAverage.toFixed(1)}
          </div>
        ) : null}

        <div className="movie-card-info">
          <h3>{movie.title}</h3>
          <p className="movie-year">{movie.year || ''}</p>
          <div className="genre-tags" style={{ marginTop: '12px' }}>
            {genresArray.map(g => (
              <span key={`rec-g-${g}`} className="genre-tag">{g}</span>
            ))}
          </div>
        </div>

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
              <div style={{ fontSize: '0.9em', color: '#cfd3d7' }}>{overview || 'No summary available.'}</div>
            </div>
            <div className="panel-section">
              <p><strong>Genres:</strong></p>
              <div className="genre-tags">
                {genresArray.length > 0 ? genresArray.map(g => (
                  <span key={`rec-g-${g}`} className="genre-tag">{g}</span>
                )) : <span>N/A</span>}
              </div>
            </div>
            <div className="panel-section">
              <p><strong>Cast:</strong></p>
              <div className="genre-tags">
                {castArray.length > 0 ? castArray.map(c => (
                  <span key={`rec-c-${c}`} className="genre-tag name-tag">{c}</span>
                )) : <span>N/A</span>}
              </div>
            </div>
            <div className="panel-section">
              <p><strong>Director:</strong></p>
              <div className="genre-tags">
                {directorsArray.length > 0 ? directorsArray.map(d => (
                  <span key={`rec-d-${d}`} className="genre-tag name-tag">{d}</span>
                )) : <span>N/A</span>}
              </div>
            </div>
          </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
