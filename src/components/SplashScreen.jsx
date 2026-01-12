import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './SplashScreen.css';
import DomeGallery from './DomeGallery';

export default function SplashScreen({
  moodText,
  setMoodText,
  setShowSplash,
  fetchMoviesFromMoodText,
  splashTopPosters
}) {
  const navigate = useNavigate();
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholders = [
    "Feeling happy today? 🎉",
    "Want a thrilling adventure? 🎬",
    "Need some motivation? 💪",
    "Looking for a good laugh? 😂",
    "In the mood for romance? 💕",
    "Craving an epic story? 🌟"
  ];

  const moodButtons = [
    { label: 'Happy', emoji: '😊', color: '#FFA500' },
    { label: 'Romantic', emoji: '💕', color: '#E91E63' },
    { label: 'Thrilling', emoji: '🔥', color: '#FF5722' },
    { label: 'Mysterious', emoji: '🎭', color: '#9C27B0' },
    { label: 'Inspiring', emoji: '✨', color: '#00BCD4' }
  ];

  const handleMoodClick = (mood) => {
    setMoodText(mood);
    setShowSplash(false);
    fetchMoviesFromMoodText(mood);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  return (
    <motion.div 
      className="splash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="dome-gallery-container">
        <DomeGallery 
          images={splashTopPosters}
          fit={0.6}
          minRadius={600}
          maxRadius={1200}
          overlayBlurColor="#0F171E"
          imageBorderRadius="12px"
          openedImageBorderRadius="24px"
          grayscale={false}
          dragSensitivity={15}
          dragDampening={2}
          openedImageWidth="300px"
          openedImageHeight="450px"
        />
      </div>
      <motion.div 
        className="splash-flex-row"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
      >
        <div className="splash-center-prompt">
          <motion.div 
            className="splash-box-logo"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <span className="logo-cine">Cine</span><span className="logo-match">Match</span>
          </motion.div>
          <motion.p 
            className="splash-box-tagline"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            Personalized movie recommendations based on your mood
          </motion.p>
          
          <motion.h1 
            className="splash-main-title"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            What's <span className="title-highlight">Your Mood?</span>
          </motion.h1>
          <motion.p 
            className="splash-subtitle"
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            Tell us how you're feeling and we'll find the perfect movies for you
          </motion.p>

          <motion.div 
            className="splash-input-container"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <input
              className="splash-mood-input"
              type="text"
              placeholder="Describe your mood or what you want to watch..."
              value={moodText}
              onChange={e => setMoodText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && moodText.trim() && (setShowSplash(false), fetchMoviesFromMoodText(moodText))}
            />
            <motion.button
              className="splash-find-btn"
              onClick={() => moodText.trim() && (setShowSplash(false), fetchMoviesFromMoodText(moodText))}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={!moodText.trim()}
            >
              <span className="sparkle-icon">✨</span>
              Find
            </motion.button>
          </motion.div>

          <motion.div 
            className="mood-buttons"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            {moodButtons.map((mood, index) => (
              <motion.button
                key={mood.label}
                className="mood-btn"
                style={{ backgroundColor: mood.color }}
                onClick={() => handleMoodClick(mood.label)}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.9 + index * 0.1, duration: 0.3 }}
                whileHover={{ scale: 1.08, y: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="mood-emoji">{mood.emoji}</span>
                {mood.label}
              </motion.button>
            ))}
          </motion.div>

          <motion.div 
            className="browse-all-section"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.5 }}
          >
            <p className="or-divider">or</p>
            <motion.button
              className="browse-all-btn"
              onClick={() => setShowSplash(false)}
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
              whileTap={{ scale: 0.95 }}
            >
              Browse All Movies
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
