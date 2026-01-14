#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install frontend dependencies and build React app
echo "📦 Installing frontend dependencies..."
npm install

echo "🏗️ Building React frontend..."
npm run build

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
pip install -r requirements.txt

# Download NLTK data
echo "📚 Downloading NLTK data..."
python -c "import nltk; nltk.download('vader_lexicon', quiet=True)"

echo "✅ Build complete!"
