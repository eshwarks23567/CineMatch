import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'motion-vendor': ['framer-motion', '@use-gesture/react']
        }
      }
    },
    chunkSizeWarningLimit: 600
  },
  resolve: {
    alias: {
      '~/': `${path.resolve(__dirname, 'src')}/`,
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    open: false,
    proxy: {
      '/top_watched': 'http://localhost:5000',
      '/my_collection': 'http://localhost:5000',
      '/get_collection': 'http://localhost:5000',
      '/add_to_collection': 'http://localhost:5000',
      '/remove_from_collection': 'http://localhost:5000',
      '/get_recommendations': 'http://localhost:5000',
      '/get_movies_by_mood': 'http://localhost:5000',
      '/moodwise_text_input': 'http://localhost:5000',
      '/get_movies_by_mood_category': 'http://localhost:5000',
      '/get_movies_by_genre': 'http://localhost:5000',
      '/get_movies_by_person': 'http://localhost:5000',
      '/search_suggestions': 'http://localhost:5000',
      '/movie_overview': 'http://localhost:5000',
      '/sample_posters': 'http://localhost:5000',
      '/movie_details': 'http://localhost:5000',
      '/recommend': 'http://localhost:5000',
    },
  },
});