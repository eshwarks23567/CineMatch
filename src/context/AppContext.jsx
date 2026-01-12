import React, { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [topWatchedMovies, setTopWatchedMovies] = useState([]);
  const [myCurrentCollection, setMyCurrentCollection] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [moodMovies, setMoodMovies] = useState([]);
  const [moodSectionTitle, setMoodSectionTitle] = useState("What's Your Mood?");
  
  const [loading, setLoading] = useState({
    topWatched: false,
    collection: false,
    recommendations: false,
    mood: false
  });
  
  const [error, setError] = useState({
    topWatched: null,
    collection: null,
    recommendations: null,
    mood: null
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [moodText, setMoodText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [splashTopPosters, setSplashTopPosters] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const showToast = useCallback((message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  }, []);

  const updateLoading = useCallback((key, value) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateError = useCallback((key, value) => {
    setError(prev => ({ ...prev, [key]: value }));
  }, []);

  const value = {
    // State
    topWatchedMovies, setTopWatchedMovies,
    myCurrentCollection, setMyCurrentCollection,
    recommendations, setRecommendations,
    moodMovies, setMoodMovies,
    moodSectionTitle, setMoodSectionTitle,
    loading, setLoading,
    error, setError,
    searchQuery, setSearchQuery,
    moodText, setMoodText,
    sidebarOpen, setSidebarOpen,
    showSplash, setShowSplash,
    splashTopPosters, setSplashTopPosters,
    suggestions, setSuggestions,
    showSuggestions, setShowSuggestions,
    highlightedIndex, setHighlightedIndex,
    toast,
    selectedGenre, setSelectedGenre,
    selectedCategory, setSelectedCategory,
    
    // Helper functions
    showToast,
    updateLoading,
    updateError
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
