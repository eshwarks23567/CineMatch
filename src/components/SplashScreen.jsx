import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function SplashScreen({
  moodText,
  setMoodText,
  setShowSplash,
  fetchMoviesFromMoodText,
  splashTopPosters
}) {
  const navigate = useNavigate();

  const moodButtons = [
    { label: 'Happy', emoji: '😊', color: 'bg-yellow-400 text-black' },
    { label: 'Romantic', emoji: '💖', color: 'bg-pink-500 text-white' },
    { label: 'Thrilling', emoji: '🔥', color: 'bg-orange-500 text-white' },
    { label: 'Mysterious', emoji: '🕵️', color: 'bg-purple-600 text-white' },
    { label: 'Inspiring', emoji: '✨', color: 'bg-cyan-500 text-white' }
  ];

  const handleMoodClick = (mood) => {
    setMoodText(mood);
    setShowSplash(false);
    fetchMoviesFromMoodText(mood);
  };

  return (
    <motion.div 
      className="min-h-[100svh] w-full flex items-center justify-center bg-[#0F171E] px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className="w-full max-w-2xl bg-[#141824]/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-10 flex flex-col items-center text-center gap-6"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
      >
        {/* Logo */}
        <motion.h1 
          className="text-4xl sm:text-5xl font-extrabold tracking-wide"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <span className="text-[#E50914]">Cine</span>
          <span className="text-[#F5C518]">Match</span>
        </motion.h1>

        {/* Tagline */}
        <motion.p 
          className="text-[#F5C518] text-sm sm:text-base opacity-90"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          Personalized movie recommendations based on your mood
        </motion.p>

        {/* Title */}
        <motion.h2 
          className="text-white text-2xl sm:text-4xl font-bold"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          What's <span className="text-[#F5C518]">Your Mood?</span>
        </motion.h2>

        {/* Input */}
        <motion.div 
          className="w-full flex flex-col sm:flex-row gap-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <input
            className="flex-1 bg-[#0F171E] border border-[#2A3847] rounded-full px-5 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F5C518]"
            placeholder="Describe your mood..."
            type="text"
            value={moodText}
            onChange={e => setMoodText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && moodText.trim() && (setShowSplash(false), fetchMoviesFromMoodText(moodText))}
          />
          <motion.button 
            className="px-8 py-4 rounded-full bg-gradient-to-r from-[#F5C518] to-[#E50914] text-white font-bold hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => moodText.trim() && (setShowSplash(false), fetchMoviesFromMoodText(moodText))}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!moodText.trim()}
          >
            ✨ Find
          </motion.button>
        </motion.div>

        {/* Mood Buttons */}
        <motion.div 
          className="flex flex-wrap justify-center gap-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          {moodButtons.map((mood, index) => (
            <motion.button
              key={mood.label}
              className={`px-5 py-3 rounded-full font-semibold ${mood.color}`}
              onClick={() => handleMoodClick(mood.label)}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.9 + index * 0.1, duration: 0.3 }}
              whileHover={{ scale: 1.08, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              {mood.emoji} {mood.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Browse Button */}
        <motion.button 
          className="mt-4 px-8 py-3 rounded-xl bg-[#1A242F] border border-[#2A3847] text-white hover:bg-[#2A3847] transition"
          onClick={() => setShowSplash(false)}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Browse All Movies
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
