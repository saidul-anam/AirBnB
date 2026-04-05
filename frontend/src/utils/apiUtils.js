// API utility functions for optimization

// Request batching to reduce API calls
export const batchApiCalls = async (calls, maxConcurrent = 3) => {
  const results = [];
  
  for (let i = 0; i < calls.length; i += maxConcurrent) {
    const batch = calls.slice(i, i + maxConcurrent);
    const batchResults = await Promise.allSettled(batch);
    
    batchResults.forEach((result, index) => {
      const globalIndex = i + index;
      if (result.status === 'fulfilled') {
        results[globalIndex] = result.value;
      } else {
        console.error(`API call ${globalIndex} failed:`, result.reason);
        results[globalIndex] = null;
      }
    });
  }
  
  return results;
};

// Request cancellation utility
export const createCancelableRequest = (promise) => {
  let isCanceled = false;
  
  const wrappedPromise = new Promise((resolve, reject) => {
    promise
      .then(value => {
        if (!isCanceled) {
          resolve(value);
        }
      })
      .catch(error => {
        if (!isCanceled) {
          reject(error);
        }
      });
  });
  
  wrappedPromise.cancel = () => {
    isCanceled = true;
  };
  
  return wrappedPromise;
};

// Response data size monitoring
export const logResponseSize = (url, data) => {
  const size = JSON.stringify(data).length;
  const sizeKB = (size / 1024).toFixed(2);
  
  if (size > 100000) { // Log if > 100KB
    console.warn(`Large response from ${url}: ${sizeKB} KB`);
  }
  
  return { size, sizeKB };
};

// Data compression for storage
export const compressForStorage = (data) => {
  try {
    const compressed = JSON.stringify(data);
    return compressed;
  } catch (err) {
    console.error('Failed to compress data for storage:', err);
    return null;
  }
};

export const decompressFromStorage = (compressed) => {
  try {
    return JSON.parse(compressed);
  } catch (err) {
    console.error('Failed to decompress data from storage:', err);
    return null;
  }
};

// Optimized API client with caching
class OptimizedApiClient {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
  }
  
  async get(url, options = {}) {
    const cacheKey = `${url}_${JSON.stringify(options.params || {})}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < (options.cacheTime || 300000)) { // 5 min default
        console.log(`Cache hit for ${url}`);
        return cached.data;
      }
    }
    
    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`Request pending for ${url}, waiting...`);
      return this.pendingRequests.get(cacheKey);
    }
    
    // Make new request
    const request = fetch(url, options)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        // Cache the result
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
        
        // Remove from pending
        this.pendingRequests.delete(cacheKey);
        
        // Log response size
        logResponseSize(url, data);
        
        return data;
      })
      .catch(error => {
        this.pendingRequests.delete(cacheKey);
        throw error;
      });
    
    this.pendingRequests.set(cacheKey, request);
    return request;
  }
  
  clearCache() {
    this.cache.clear();
    console.log('API cache cleared');
  }
  
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size
    };
  }
}

export const optimizedApiClient = new OptimizedApiClient();
