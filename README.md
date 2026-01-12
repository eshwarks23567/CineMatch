# 🎬 CineMatch

**Your Ultimate AI-Powered Movie Recommender**

CineMatch is an intelligent movie recommendation system that understands your mood and preferences to suggest the perfect films. Built with React and Flask, it combines sentiment analysis, cosine similarity algorithms, and The Movie Database (TMDB) API to deliver personalized movie recommendations.

![CineMatch](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)
![Flask](https://img.shields.io/badge/Flask-Latest-000000?logo=flask)

---

## ✨ Features

### 🎯 Core Functionality
- **Mood-Based Recommendations**: Describe your mood in natural language and get matching movie suggestions
- **Smart Search**: Intelligent autocomplete with fuzzy matching for movie titles
- **Genre & Category Filters**: Browse movies by genre, mood categories (Happy, Sad, Intense, Horror, etc.)
- **Personalized Collection**: Save your favorite movies to a personal collection
- **Similar Movie Recommendations**: Get recommendations based on movies you love
- **Actor/Director Search**: Find movies by your favorite cast or crew members

### 🎨 User Experience
- **Stunning 3D Gallery**: Interactive dome-shaped splash screen with movie posters
- **Smooth Animations**: Powered by Framer Motion for fluid transitions
- **Skeleton Loaders**: Professional loading states that reduce perceived wait time
- **Responsive Design**: Optimized for desktop and mobile devices
- **Netflix-Style Rows**: Horizontally scrollable movie carousels

### ♿ Accessibility & Performance
- **WCAG 2.1 Compliant**: Full keyboard navigation and screen reader support
- **Error Boundaries**: Graceful error handling prevents app crashes
- **Network Resilience**: Automatic retry logic with exponential backoff
- **SEO Optimized**: Comprehensive meta tags for search engines and social sharing

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **TMDB API Key** ([Get yours here](https://www.themoviedb.org/settings/api))

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/CineMatch.git
cd CineMatch
```

#### 2. Backend Setup
```bash
# Install Python dependencies
pip install pandas numpy scikit-learn flask flask-cors flask-limiter nltk requests

# Download required NLTK data
python -c "import nltk; nltk.download('vader_lexicon')"

# Update TMDB API key in app.py (line 69)
# Replace 'YOUR_TMDB_API_KEY' with your actual key

# Start Flask server
python app.py
```
The backend will run on `http://localhost:5000`

#### 3. Frontend Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```
The frontend will run on `http://localhost:5173`

### Build for Production
```bash
# Build optimized frontend
npm run build

# Preview production build
npm run preview
```

---

## 📁 Project Structure

```
CineMatch/
├── app.py                      # Flask backend server
├── package.json                # Frontend dependencies
├── vite.config.js              # Vite configuration
├── tailwind.config.js          # Tailwind CSS config
├── data/                       # Movie datasets
│   ├── tmdb_5000_movies.csv
│   ├── tmdb_5000_credits.csv
│   └── tmdb_5000_movies_enriched.csv
├── src/                        # React source code
│   ├── main.jsx               # App entry point
│   ├── App.jsx                # Main application component
│   ├── App.css                # Global styles
│   ├── api.js                 # API client with retry logic
│   ├── components/            # Reusable components
│   │   ├── AnimatedList.jsx   # Animated movie list
│   │   ├── DomeGallery.jsx    # 3D poster gallery
│   │   ├── ErrorBoundary.jsx  # Error handling wrapper
│   │   ├── SkeletonLoader.jsx # Loading skeletons
│   │   ├── SplashScreen.jsx   # Landing page
│   │   └── ui/                # UI primitives (shadcn)
│   ├── context/               # State management
│   │   └── AppContext.jsx     # Global app context
│   ├── pages/                 # Route pages
│   │   ├── MovieDetail.jsx    # Movie details view
│   │   └── Recommendations.jsx # Recommendations page
│   └── utils/                 # Utility functions
│       └── fetchHelpers.js    # Network retry logic
└── build/                     # Production build output
```

---

## 🛠️ Tech Stack

### Frontend
- **React 18.3.1** - UI framework
- **React Router 6.30** - Client-side routing
- **Framer Motion 12.25** - Animation library
- **Vite 5.3** - Build tool
- **Tailwind CSS 4.1** - Utility-first CSS framework
- **Radix UI** - Accessible UI primitives
- **Lucide React** - Icon library

### Backend
- **Flask** - Python web framework
- **Pandas & NumPy** - Data processing
- **Scikit-learn** - Machine learning (cosine similarity)
- **NLTK VADER** - Sentiment analysis
- **Flask-CORS** - Cross-origin resource sharing
- **Flask-Limiter** - Rate limiting (200/day, 50/hour per IP)
- **Requests** - HTTP client with retry strategy

### APIs
- **TMDB API** - Movie metadata, posters, cast, reviews

---

## 📊 How It Works

### 1. Content-Based Filtering
CineMatch uses cosine similarity to compare movie features:
- **Genres**: Action, Comedy, Drama, etc.
- **Keywords**: Plot themes and concepts
- **Cast & Crew**: Actors, directors, producers
- **Overview**: Movie descriptions

### 2. Sentiment Analysis
NLTK's VADER analyzer processes your mood input:
```
"I want something thrilling" → Recommends action/thriller movies
"I need a good laugh" → Suggests comedies
"Feeling romantic" → Returns romantic films
```

### 3. Mood Categories
Movies are automatically categorized by sentiment and genre:
- **Happy** - Comedies, family films, animations
- **Sad** - Dramas, emotional stories
- **Intense/Mystery** - Thrillers, crime, mystery
- **Horror** - Horror films
- **Romcom** - Romantic comedies

---

## 🔒 Security Features

- **CORS Protection**: Restricted to allowed origins
- **Rate Limiting**: 200 requests/day, 50/hour per IP
- **Session Management**: Secure session storage
- **Input Validation**: Sanitized user inputs
- **Error Boundaries**: Prevents cascading failures
- **Network Timeouts**: 10-second request timeout

---

## 🎮 API Endpoints

### Movies
- `GET /` - Serve React app
- `POST /recommend` - Get recommendations for a movie
- `POST /moodwise_text_input` - Mood-based recommendations
- `POST /get_movies_by_genre` - Filter by genre
- `POST /get_movies_by_person` - Filter by actor/director
- `POST /get_movies_by_mood_category` - Filter by mood

### User Collections
- `GET /get_collection` - Fetch user's saved movies
- `POST /add_to_collection` - Add movie to collection
- `POST /remove_from_collection` - Remove from collection

### Metadata
- `GET /movie_details?movie_id=<id>` - Full movie details
- `POST /movie_overview` - Fetch movie overview
- `GET /search_suggestions?q=<query>` - Search autocomplete
- `GET /sample_posters?limit=<num>` - Random poster URLs
- `GET /top_watched` - Trending movies

---

## 🚦 Development Workflow

### Running Tests
```bash
# Frontend linting
npm run lint

# Backend syntax check
python -m py_compile app.py
```

### Environment Variables
Create a `.env` file (not tracked in git):
```env
TMDB_API_KEY=your_api_key_here
FLASK_SECRET_KEY=your_secret_key_here
```

### Debug Mode
```bash
# Backend with Flask debug
python app.py  # Debug is enabled by default

# Frontend with hot reload
npm run dev
```

---

## 📦 Deployment

### Heroku Deployment
```bash
# Create Procfile
echo "web: gunicorn app:app" > Procfile

# Create requirements.txt
pip freeze > requirements.txt

# Deploy
heroku create cinematch-app
git push heroku main
```

### Vercel Deployment (Frontend)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Docker (Optional)
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

---

## 🐛 Troubleshooting

### Common Issues

**1. TMDB API Key Error**
```
Error: Invalid API key
Fix: Update TMDB_API_KEY in app.py with your actual key
```

**2. NLTK Data Missing**
```
LookupError: Resource 'vader_lexicon' not found
Fix: python -c "import nltk; nltk.download('vader_lexicon')"
```

**3. CORS Errors**
```
Access-Control-Allow-Origin error
Fix: Ensure Flask server is running and CORS origins match
```

**4. Port Already in Use**
```
OSError: [Errno 48] Address already in use
Fix: Change port in app.py: app.run(port=5001)
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [The Movie Database (TMDB)](https://www.themoviedb.org/) - Movie data and posters
- [NLTK](https://www.nltk.org/) - Natural language processing
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Radix UI](https://www.radix-ui.com/) - Accessible primitives

---

## 📧 Contact

**Project Link:** [https://github.com/yourusername/CineMatch](https://github.com/yourusername/CineMatch)

**Issues:** [https://github.com/yourusername/CineMatch/issues](https://github.com/yourusername/CineMatch/issues)

---

<div align="center">
  Made with ❤️ for movie lovers
</div>
#   C i n e M a t c h 
 
 
