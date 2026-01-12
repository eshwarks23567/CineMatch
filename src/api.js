// Centralized API helpers with retry logic
import { robustFetch } from './utils/fetchHelpers';

export async function getTopWatched() {
  const res = await robustFetch('/top_watched');
  if (!res.ok) throw new Error('Failed to fetch top watched');
  return res.json();
}

export async function getCollection() {
  const res = await robustFetch('/get_collection');
  if (!res.ok) throw new Error('Failed to fetch collection');
  return res.json();
}

export async function getMoviesByMoodCategory(category) {
  const res = await robustFetch('/get_movies_by_mood_category', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category })
  });
  if (!res.ok) throw new Error('Failed to fetch mood category');
  return res.json();
}

export async function getMoviesByGenre(genre) {
  const res = await robustFetch('/get_movies_by_genre', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ genre })
  });
  if (!res.ok) throw new Error('Failed to fetch genre');
  return res.json();
}

export async function getMoviesByPerson(role, name) {
  const res = await robustFetch('/get_movies_by_person', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, name })
  });
  if (!res.ok) throw new Error('Failed to fetch person');
  return res.json();
}

export async function getMoodwiseText(text) {
  const res = await robustFetch('/moodwise_text_input', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error('Failed to fetch moodwise text');
  return res.json();
}

export async function getSamplePosters(limit = 120) {
  const res = await robustFetch(`/sample_posters?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch posters');
  return res.json();
}
