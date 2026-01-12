/**
 * Retry fetch with exponential backoff
 * @param {Function} fetchFn - The fetch function to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} delayMs - Initial delay in milliseconds
 * @returns {Promise}
 */
export async function retryFetch(fetchFn, maxRetries = 3, delayMs = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchFn();
      
      // If response is ok, return it
      if (response.ok) {
        return response;
      }
      
      // If it's a 4xx error (client error), don't retry
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status} ${response.statusText}`);
      }
      
      // Store the error for potential retry
      lastError = new Error(`Server error: ${response.status} ${response.statusText}`);
      
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors or if we've exhausted retries
      if (attempt === maxRetries || error.message.includes('Client error')) {
        throw lastError;
      }
      
      // Calculate exponential backoff delay
      const waitTime = delayMs * Math.pow(2, attempt);
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${waitTime}ms...`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
}

/**
 * Fetch with timeout
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

// Get API base URL from environment or use production default
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://cinematch-api-9l0w.onrender.com';

/**
 * Combined retry with timeout
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} timeoutMs - Request timeout
 * @returns {Promise<Response>}
 */
export async function robustFetch(url, options = {}, maxRetries = 3, timeoutMs = 10000) {
  // Prepend API base URL to relative paths
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  return retryFetch(
    () => fetchWithTimeout(fullUrl, options, timeoutMs),
    maxRetries
  );
}
