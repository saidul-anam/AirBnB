// Performance optimization utilities

// Debounce function to limit API calls
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function to limit function calls
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Memory management for large datasets
export const clearOldCache = (prefix, maxAge = 24 * 60 * 60 * 1000) => { // 24 hours default
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    
    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        try {
          const cached = JSON.parse(localStorage.getItem(key));
          if (cached && cached.timestamp && (now - cached.timestamp) > maxAge) {
            localStorage.removeItem(key);
          }
        } catch (err) {
          // Remove corrupted cache entries
          localStorage.removeItem(key);
        }
      }
    });
  } catch (err) {
    console.warn('Failed to clear old cache:', err);
  }
};

// Virtual scrolling helper for large lists
export const getVisibleItems = (items, scrollTop, containerHeight, itemHeight, buffer = 5) => {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + buffer
  );
  
  return {
    items: items.slice(startIndex, endIndex + 1),
    startIndex,
    endIndex,
    totalHeight: items.length * itemHeight
  };
};

// Image preloading for better UX
export const preloadImages = (urls, maxConcurrent = 3) => {
  return new Promise((resolve) => {
    let loaded = 0;
    let failed = 0;
    const total = urls.length;
    
    const loadImage = (url) => {
      return new Promise((imgResolve) => {
        const img = new Image();
        img.onload = () => {
          loaded++;
          imgResolve();
        };
        img.onerror = () => {
          failed++;
          imgResolve();
        };
        img.src = url;
      });
    };
    
    // Process images in batches
    const processBatch = async (start) => {
      const end = Math.min(start + maxConcurrent, total);
      const batch = urls.slice(start, end);
      
      await Promise.all(batch.map(loadImage));
      
      if (end < total) {
        processBatch(end);
      } else {
        resolve({ loaded, failed, total });
      }
    };
    
    if (total > 0) {
      processBatch(0);
    } else {
      resolve({ loaded: 0, failed: 0, total: 0 });
    }
  });
};

// Memory usage monitoring
export const checkMemoryUsage = () => {
  if (performance.memory) {
    const memory = performance.memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1048576), // MB
      total: Math.round(memory.totalJSHeapSize / 1048576), // MB
      limit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
    };
  }
  return null;
};

// Cleanup utility
export const cleanup = () => {
  // Clear old cache entries
  clearOldCache('search_cache_');
  clearOldCache('host_suggestions_cache');
  
  // Log memory usage
  const memory = checkMemoryUsage();
  if (memory) {
    console.log('Memory usage:', memory);
  }
};
