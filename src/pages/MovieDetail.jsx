import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';


export default function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [movie, setMovie] = useState(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState(null);
  const [recommended, setRecommended] = useState([]);
  const [personQuery, setPersonQuery] = useState(null);
  const [personLoading, setPersonLoading] = useState(false);
  const [personError, setPersonError] = useState(null);
  const [personMovies, setPersonMovies] = useState([]);
  const personSectionRef = useRef(null);
  const onPersonClick = (role, name) => {
    const nm = (name || '').trim();
    setPersonMovies([]);
    setPersonError(null);
    setPersonQuery({ role, name: nm });
  };

  useEffect(() => {
    let ignore = false;

    // Derive ID from params or URL path as fallback
    const routeId = id ?? (typeof window !== 'undefined' ? window.location.pathname.split('/').filter(Boolean).pop() : undefined);
    const safeId = routeId && routeId !== 'undefined' && routeId !== 'null' ? routeId : undefined;
    const titleFromState = location && location.state ? location.state.title : undefined;

    setLoading(true);
    setError(null);

    if (!safeId && !titleFromState) {
      if (!ignore) {
        setError('Invalid or missing movie id');
        setLoading(false);
      }
      return () => { ignore = true; };
    }

    const url = safeId
      ? `/movie_details?movie_id=${encodeURIComponent(safeId)}`
      : `/movie_details?title=${encodeURIComponent(titleFromState)}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!ignore) {
          if (data.error) {
            setError(data.error);
            setLoading(false);
            return;
          }
          setMovie(data);
          setLoading(false);
        }
      })
      .catch((e) => { if (!ignore) { setError(e.message || 'Failed to load movie'); setLoading(false); } });

    return () => { ignore = true; };
  }, [id, location?.state?.title, location?.pathname]);

  useEffect(() => {
    if (!movie || !movie.title) return;
    let ignore = false;
    setRecLoading(true);
    setRecError(null);

    // First try to get movies from the same franchise
    const franchiseSearch = movie.title.split(/[:\-–—]/)[0].trim(); // Get the main title before any subtitle
    
    fetch('/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        title: franchiseSearch,
        include_franchise: true 
      })
    })
      .then(res => {
        if (!res.ok) return res.json().then(err => { throw new Error(err.error || `HTTP ${res.status}`); });
        return res.json();
      })
      .then(data => {
        if (!ignore) {
          const list = Array.isArray(data.recommendations) ? data.recommendations : [];
          setRecommended(list.filter(r => r && String(r.movie_id) !== String(movie.movie_id)));
          setRecLoading(false);
        }
      })
      .catch(e => { if (!ignore) { setRecError(e.message || 'Failed to load recommendations'); setRecLoading(false); } });
    return () => { ignore = true; };
  }, [movie?.title]);

useEffect(() => {
  if (!personQuery) return;
  let ignore = false;
  setPersonLoading(true);
  setPersonError(null);
  setPersonMovies([]);
  fetch('/get_movies_by_person', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: personQuery.role, name: personQuery.name })
  })
    .then(res => res.ok ? res.json() : res.json().then(err => { throw new Error(err.error || `HTTP ${res.status}`); }))
    .then(data => {
      if (!ignore) {
        const list = Array.isArray(data.movies) ? data.movies : [];
        setPersonMovies(list);
        setPersonLoading(false);
      }
    })
    .catch(e => { if (!ignore) { setPersonError(e.message || 'Failed to load'); setPersonLoading(false); } });
  return () => { ignore = true; };
}, [personQuery]);

  const PlaceholderProfile = 'https://placehold.co/150x225/333/999?text=No+Photo';

  if (loading) {
    return (
      <div className="container">
        <h2 className="section-title">Loading...</h2>
      </div>
    );
  }
  if (error || !movie) {
    return (
      <div className="container">
        <h2 className="section-title">Movie Details</h2>
        <div className="error">{error || 'Movie not found'}</div>
        <div style={{textAlign:'center', marginTop: 20}}>
          <Link to="/" style={{ color: '#00A8E1' }}>Back to Home</Link>
        </div>
      </div>
    );
  }

  const {
    title,
    poster_url,
    backdrop_url,
    year,
    genres = [],
    runtime,
    vote_average,
    vote_count,
    language,
    homepage,
    overview,
    cast = [],
    directors = [],
    reviews = []
  } = movie;

  return (
    <motion.div 
      className="movie-detail-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Hero/banner */}
      <motion.div
        className="movie-detail-hero"
        style={{
          backgroundImage: backdrop_url ? `url(${backdrop_url})` : 'none'
        }}
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7 }}
      >
        <div className="default-ltr-cache-1abfllx" />
        <motion.div 
          className="container" 
          style={{ position: 'relative', zIndex: 3, paddingTop: 40, paddingBottom: 22 }}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end' }}>
            <motion.img
              className="movie-detail-poster"
              src={poster_url}
              alt={`${title} poster`}
              onError={(e) => { e.currentTarget.src = 'https://placehold.co/220x330/333/999?text=No+Poster'; }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              whileHover={{ scale: 1.05, transition: { duration: 0.3 } }}
            />
            <motion.div 
              style={{ paddingBottom: 12 }}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <h1 className="movie-detail-title">{title}</h1>
              <div className="movie-meta-info">
                {year && <span>{year}</span>}
                {runtime ? <span>{runtime} min</span> : null}
                {language && <span>{language}</span>}
                {vote_average ? (
                  <span className="rating">
                    <span className="star">★</span> 
                    {Number(vote_average).toFixed(1)} 
                    <span className="vote-count">({vote_count || 0})</span>
                  </span>
                ) : null}
              </div>
              {genres.length > 0 && (
                <motion.div 
                  className="genre-tags two-row-grid" 
                  style={{ marginTop: 10 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                >
                  {genres.slice(0, 4).map((g, idx) => (
                    <motion.span 
                      key={g} 
                      className="genre-tag" 
                      onClick={(e) => {
                        e.stopPropagation();
                          navigate(`/recommendations?genre=${encodeURIComponent(g)}`, { state: { genre: g } });
                      }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.65 + idx * 0.05, duration: 0.3 }}
                      whileHover={{ scale: 1.1, transition: { duration: 0.2 } }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {g}
                    </motion.span>
                  ))}
                </motion.div>
              )}
              {directors.length > 0 && (
                <div style={{ marginTop: 8, color: '#cfd3d7' }}>
                  Directed by {directors.map((d, idx) => (
                    <span key={`dir-${d}`} className="genre-tag name-tag" style={{ marginLeft: idx === 0 ? 6 : 8 }} onClick={() => onPersonClick('director', d)}>{d}</span>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 14, display: 'flex', gap: 14, alignItems: 'center' }}>
                <button className="nav-button back-button" onClick={() => navigate(-1)}>
                  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                  </svg>
                  Back
                </button>
                {homepage && (
                  <a href={homepage} target="_blank" rel="noopener noreferrer" className="mood-input-go" style={{ textAlign: 'center' }}>
                    Official Site ↗
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div 
        className="container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <div className="movie-grid-sidebar">
          <div>
            {/* Overview */}
            <motion.section 
              className="panel-section" 
              style={{ marginBottom: 28 }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <motion.h2 
                className="section-title" 
                style={{ marginTop: 0 }}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              >
                Overview
              </motion.h2>
              <motion.p 
                style={{ color: '#cfd3d7', fontSize: '1.05em' }}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                {overview || 'No overview available.'}
              </motion.p>
            </motion.section>

            {/* Cast */}
            <motion.section 
              className="panel-section" 
              style={{ marginBottom: 28 }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <motion.h2 
                className="section-title" 
                style={{ marginTop: 0 }}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 1.0, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              >
                Top Cast
              </motion.h2>
              {cast.length === 0 ? (
                <div className="no-results">No cast data available.</div>
              ) : (
                <div className="crew-grid">
                  {cast.map((c) => (
                    <div key={c.id || c.name} className="crew-card" onClick={() => onPersonClick('cast', c.name)}>
                      <img
                        src={c.profile_url || PlaceholderProfile}
                        alt={c.name}
                        className="crew-image"
                        loading="lazy"
                        onError={(e) => { 
                          if (e.currentTarget.src !== PlaceholderProfile) {
                            e.currentTarget.src = PlaceholderProfile;
                          }
                        }}
                      />
                      <div className="crew-info">
                        <div className="crew-name" title={c.name} onClick={(e) => { e.stopPropagation(); onPersonClick('cast', c.name); }}>{c.name}</div>
                        <div className="crew-role">{c.character || ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.section>

            {personQuery && (
              <motion.section 
                className="panel-section" 
                style={{ marginBottom: 28 }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <motion.h2 
                  className="section-title" 
                  style={{ marginTop: 0 }}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  {personQuery.role === 'director' ? `Directed by ${personQuery.name}` : `Featuring ${personQuery.name}`}
                </motion.h2>
                {personLoading ? (
                  <div className="loading">Loading...</div>
                ) : personError ? (
                  <div className="error">{personError}</div>
                ) : !personMovies || personMovies.length === 0 ? (
                  <div className="no-results">No movies found.</div>
                ) : (
                  <div className="movies-grid rec-grid">
                    {personMovies.map((m) => (
                      <div key={m.movie_id} className="movie-card-container" onClick={() => navigate(`/movie/${m.movie_id}`, { state: { title: m.title } })}>
                        <div className="movie-card">
                          <img
                            src={m.poster_url || 'https://placehold.co/200x300/333/999?text=No+Poster'}
                            alt={`${m.title} poster`}
                            loading="lazy"
                            onError={(e) => { 
                              if (e.currentTarget.src !== 'https://placehold.co/200x300/333/999?text=No+Poster') {
                                e.currentTarget.src = 'https://placehold.co/200x300/333/999?text=No+Poster';
                              }
                            }}
                          />
                          <div className="movie-card-info">
                            <h3>{m.title}</h3>
                            <p className="movie-year">{m.year || ''}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.section>
            )}

            {/* Reviews */}
            <motion.section 
              className="movie-section" 
              style={{ marginBottom: 40 }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <motion.h2 
                className="section-title" 
                style={{ marginTop: 0 }}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 1.3, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              >
                Reviews
              </motion.h2>
              {reviews.length === 0 ? (
                <div className="no-results">No reviews found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {reviews.slice(0, 3).map((r, idx) => (
                    <div key={idx} className="movie-review-card">
                      <div className="review-header">
                        <div className="review-author">{r.author || 'Anonymous'}</div>
                        {r.rating != null && <div className="rating">★ {r.rating}</div>}
                      </div>
                      <div className="review-content">
                        {r.content.length > 300 ? `${r.content.substring(0, 300)}...` : r.content}
                      </div>
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="review-link">
                          Read full review ↗
                        </a>
                      )}
                    </div>
                  ))}
                  {reviews.length > 3 && (
                    <button className="mood-input-go" onClick={() => window.open(movie.imdb_url || `https://www.imdb.com/title/${movie.imdb_id}`, '_blank')}>
                      See all reviews on IMDb ↗
                    </button>
                  )}
                </div>
              )}
            </motion.section>
          </div>

          {/* Right sidebar: Franchise & Similar Movies */}
          <aside style={{ position: 'sticky', top: 20, paddingLeft: 20, borderLeft: '1px solid var(--muted)' }}>
            {/* First show franchise movies if they exist */}
            {title && (
              <motion.section 
                className="panel-section" 
                style={{ marginBottom: 28 }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <motion.h2 
                  className="section-title" 
                  style={{ marginTop: 0, textAlign: 'left' }}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.6, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  More in this Franchise
                </motion.h2>
                {recLoading ? (
                  <div className="loading">Loading...</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {recommended
                      .filter(m => m.title.toLowerCase().includes(title.toLowerCase()) || 
                                 title.toLowerCase().includes(m.title.toLowerCase()) ||
                                 (m.title.toLowerCase().match(/part|chapter|episode/i) && 
                                  m.genres.some(g => movie.genres.includes(g))))
                      .map((m) => (
                        <div key={m.movie_id} className="movie-card similar-movie-card franchise-movie" 
                             onClick={() => navigate(`/movie/${m.movie_id}`, { state: { title: m.title } })}>
                          <img
                            src={m.poster_url || 'https://placehold.co/200x300/333/999?text=No+Poster'}
                            alt={`${m.title} poster`}
                            loading="lazy"
                            onError={(e) => { 
                              if (e.currentTarget.src !== 'https://placehold.co/200x300/333/999?text=No+Poster') {
                                e.currentTarget.src = 'https://placehold.co/200x300/333/999?text=No+Poster';
                              }
                            }}
                            style={{ width: 140, height: 210, objectFit: 'cover', marginBottom: 0, borderRadius: 4 }}
                          />
                          <div className="movie-card-info" style={{ alignItems: 'flex-start' }}>
                            <h3 title={m.title} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>{m.title}</h3>
                            <div className="meta-info">{m.year || ''}</div>
                            <div className="genre-tags" style={{ justifyContent: 'flex-start', marginTop: 6 }}>
                              {(Array.isArray(m.genres) ? m.genres : []).slice(0, 3).map((g) => (
                                <span key={`${m.movie_id}-g-${g}`} className="genre-tag" 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        navigate('/', { state: { genre: g } }); 
                                      }}>{g}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                    ))}
                  </div>
                )}
              </motion.section>
            )}
            
            {/* Then show other recommended movies */}
            <motion.section 
              className="panel-section" 
              style={{ marginBottom: 28 }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <motion.h2 
                className="section-title" 
                style={{ marginTop: 0, textAlign: 'left' }}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.9, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              >
                You may also like
              </motion.h2>
              {recLoading ? (
                <div className="loading">Loading...</div>
              ) : recError ? (
                <div className="error">{recError}</div>
              ) : !recommended || recommended.length === 0 ? (
                <div className="no-results">No similar titles found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {recommended
                    .filter(m => !m.title.toLowerCase().includes(title.toLowerCase()) && 
                               !title.toLowerCase().includes(m.title.toLowerCase()))
                    .map((m) => (
                    <div key={m.movie_id} className="movie-card similar-movie-card" onClick={() => navigate(`/movie/${m.movie_id}`, { state: { title: m.title } })}>
                      <img
                        src={m.poster_url || 'https://placehold.co/200x300/333/999?text=No+Poster'}
                        alt={`${m.title} poster`}
                        loading="lazy"
                        onError={(e) => { 
                          if (e.currentTarget.src !== 'https://placehold.co/200x300/333/999?text=No+Poster') {
                            e.currentTarget.src = 'https://placehold.co/200x300/333/999?text=No+Poster';
                          }
                        }}
                        style={{ width: 140, height: 210, objectFit: 'cover', marginBottom: 0, borderRadius: 4 }}
                      />
                      <div className="movie-card-info" style={{ alignItems: 'flex-start' }}>
                        <h3 title={m.title} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>{m.title}</h3>
                        <div className="meta-info">{m.year || ''}</div>
                        <div className="genre-tags" style={{ justifyContent: 'flex-start', marginTop: 6 }}>
                          {(Array.isArray(m.genres) ? m.genres : []).slice(0, 3).map((g) => (
                            <span key={`${m.movie_id}-g-${g}`} className="genre-tag" onClick={(e) => { e.stopPropagation(); navigate(`/recommendations?genre=${encodeURIComponent(g)}`, { state: { genre: g } }); }}>{g}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.section>
          </aside>
        </div>
      </motion.div>
    </motion.div>
  );
}
