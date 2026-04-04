import api from "../utils/axiosConfig";

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const TIMEOUT = 10000; // Reduced from 15s to 10s

// Helper function for retry logic
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (fetchFn, retries = MAX_RETRIES) => {
  try {
    return await fetchFn();
  } catch (error) {
    if (retries > 0 && shouldRetry(error)) {
      console.warn(`Request failed, retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`, error.message);
      await sleep(RETRY_DELAY * (MAX_RETRIES - retries + 1)); // Exponential backoff
      return fetchWithRetry(fetchFn, retries - 1);
    }
    throw error;
  }
};

const shouldRetry = (error) => {
  // Don't retry on 4xx errors (client errors)
  if (error.response?.status >= 400 && error.response?.status < 500) {
    return false;
  }
  // Retry on network errors, timeouts, and 5xx errors
  return !error.response || error.response?.status >= 500 || error.code === 'ECONNABORTED';
};

export const getHostSuggestions = async (limit = 20, page = 0) => {
  try {
    console.log('Fetching host suggestions with params:', { location: "", page, limit });
    
    const response = await fetchWithRetry(async () => 
      api.get("/api/users/hosts/suggestions", {
        params: { 
          location: "",
          page,
          limit
        },
        timeout: TIMEOUT,
      })
    );
    
    console.log('API Response status:', response.status);
    console.log('API Response data type:', typeof response.data);
    console.log('API Response data:', response.data);
    
    const data = response.data;
    
    // Handle different response formats
    let hostArray = [];
    if (Array.isArray(data)) {
      hostArray = data;
    } else if (data && typeof data === 'object') {
      // Check if it's a paginated response
      if (data.content && Array.isArray(data.content)) {
        hostArray = data.content;
        console.log('Extracted from paginated response - content length:', hostArray.length);
      } else if (data.data && Array.isArray(data.data)) {
        hostArray = data.data;
        console.log('Extracted from nested data - data length:', hostArray.length);
      } else {
        console.warn('Object response but no array found in common properties:', Object.keys(data));
      }
    }
    
    if (!Array.isArray(hostArray)) {
      console.warn("Could not extract array from host suggestions:", typeof data, data);
      return [];
    }
    
    console.log(`Successfully extracted ${hostArray.length} host suggestions for page ${page}`);
    return hostArray;
  } catch (err) {
    console.error("Failed to fetch host suggestions after retries:", err?.message || err);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};

export const searchHosts = async ({
  location = "",
  checkin = null,
  checkout = null,
  guests = 0,
  page = 0,
  limit = 50,
}) => {
  try {
    // Fetch from server with filters and retry logic
    const response = await fetchWithRetry(async () =>
      api.get("/api/users/hosts/suggestions", {
        params: { 
          location,
          page,
          limit
        },
        timeout: TIMEOUT,
      })
    );
    
    let hosts = Array.isArray(response.data) ? response.data : [];
    console.log(`Search returned ${hosts.length} hosts for location: "${location}"`);

    // Client-side guest capacity filter
    if (guests > 0) {
      const beforeFilter = hosts.length;
      hosts = hosts.filter((h) => (h.guestCapacity || 2) >= guests);
      console.log(`Filtered by guest capacity (${guests}): ${beforeFilter} -> ${hosts.length}`);
    }

    // If no hosts found for a location filter, fallback to all hosts:
    if (hosts.length === 0 && location && location.trim()) {
      console.info(`No hosts found for location '${location}', retrying without location filter`);
      const fallbackResponse = await fetchWithRetry(async () =>
        api.get("/api/users/hosts/suggestions", {
          params: {
            location: "",
            page: 0,
            limit: 200,
          },
          timeout: TIMEOUT,
        })
      );
      hosts = Array.isArray(fallbackResponse.data) ? fallbackResponse.data : [];
      if (guests > 0) {
        const beforeFilter = hosts.length;
        hosts = hosts.filter((h) => (h.guestCapacity || 2) >= guests);
        console.log(`Fallback guest capacity filter (${guests}): ${beforeFilter} -> ${hosts.length}`);
      }
    }

    // If dates provided, check availability (non-blocking)
    if (checkin && checkout && hosts.length > 0) {
      try {
        const checkInDate =
          typeof checkin === "string"
            ? checkin.split("T")[0]
            : new Date(checkin).toISOString().split("T")[0];
        const checkOutDate =
          typeof checkout === "string"
            ? checkout.split("T")[0]
            : new Date(checkout).toISOString().split("T")[0];

        console.log(`Checking availability for ${checkInDate} to ${checkOutDate}`);
        
        const availResponse = await api.get("/api/availability/available-hosts", {
          params: { checkIn: checkInDate, checkOut: checkOutDate },
          timeout: 5000, // Shorter timeout for availability check
        });
        
        const availableHostIds = new Set(availResponse.data || []);
        console.log(`Availability check returned ${availableHostIds.size} available hosts`);

        if (availableHostIds.size > 0) {
          const beforeFilter = hosts.length;
          const filtered = hosts.filter(
            (h) => availableHostIds.has(h.userId) || availableHostIds.has(h.id)
          );
          if (filtered.length > 0) {
            hosts = filtered;
            console.log(`Applied availability filter: ${beforeFilter} -> ${hosts.length}`);
          }
        }
      } catch (err) {
        console.warn("Availability check failed, showing all results:", err?.message);
        // Continue with all hosts if availability check fails
      }
    }

    return hosts;
  } catch (err) {
    console.error("Search failed after retries:", err?.message || err);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};

export const checkHostAvailability = async (hostId, checkIn, checkOut) => {
  try {
    const response = await fetchWithRetry(async () =>
      api.get("/api/availability/check", {
        params: { hostId, checkIn, checkOut },
        timeout: 5000,
      })
    );
    return response.data;
  } catch (err) {
    console.error("Availability check failed:", err?.message);
    // Return true as fallback (assume available) to prevent blocking bookings
    return true;
  }
};
