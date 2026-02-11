// api-services.js
// ================
// Handles all external API integrations

const CONFIG = {
    unsplashAccessKey: 'keUYcMEaU8NU_K5-zgrqATPWKPqZIaJCuAKmaHS_NaI',
    calendarificKey: 'jssDPFnEw6b9aQCxE2yOECObbUPYoOlQ',
    unsplashCacheDuration: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
};

// Load config from config.json
async function loadConfig() {
    try {
        const response = await fetch('json/config.json');
        const config = await response.json();
        CONFIG.unsplashAccessKey = config.unsplashAccessKey;
        CONFIG.calendarificKey = config.calendarificKey;
        console.log('Config loaded successfully');
    } catch (error) {
        console.error('Failed to load config:', error);
        // Fallback to environment or hardcoded keys (not recommended for production)
        CONFIG.unsplashAccessKey = 'YOUR_UNSPLASH_ACCESS_KEY';
        CONFIG.calendarificKey = 'YOUR_CALENDARIFIC_KEY';
    }
}

// Initialize config on load
document.addEventListener('DOMContentLoaded', loadConfig);

// ========================
// UNSPLASH API FUNCTIONS
// ========================

/**
 * Fetch image suggestions from Unsplash based on milestone category/title
 * @param {string} query - Search query
 * @param {string} orientation - 'landscape', 'portrait', or 'squarish'
 * @param {number} perPage - Number of results (1-30)
 * @returns {Promise<Array>} - Array of image objects
 */
async function fetchUnsplashImages(query, orientation = 'landscape', perPage = 5) {
    if (!CONFIG.unsplashAccessKey) {
        console.warn('Unsplash API key not configured');
        return getFallbackImages();
    }

    // Check cache first
    const cacheKey = `unsplash_${query}_${orientation}`;
    const cached = getFromCache(cacheKey);
    if (cached) {
        console.log('Returning cached Unsplash results for:', query);
        return cached;
    }

    try {
        const url = new URL('https://api.unsplash.com/search/photos');
        url.searchParams.append('query', query);
        url.searchParams.append('orientation', orientation);
        url.searchParams.append('per_page', perPage);
        url.searchParams.append('content_filter', 'high');

        const response = await fetch(url, {
            headers: {
                'Authorization': `Client-ID ${CONFIG.unsplashAccessKey}`,
                'Accept-Version': 'v1'
            }
        });

        if (!response.ok) {
            if (response.status === 403) {
                console.error('Unsplash API rate limit exceeded or invalid key');
            }
            throw new Error(`Unsplash API error: ${response.status}`);
        }

        const data = await response.json();

        // Transform and cache the results
        const images = data.results.map(img => ({
            id: img.id,
            urls: {
                thumb: img.urls.thumb,
                small: img.urls.small,
                regular: img.urls.regular,
                full: img.urls.full
            },
            alt: img.alt_description || img.description || query,
            color: img.color,
            width: img.width,
            height: img.height,
            author: {
                name: img.user.name,
                username: img.user.username,
                link: img.user.links.html,
                portfolio: img.user.portfolio_url
            },
            downloadLink: img.links.download_location
        }));

        // Cache the results
        saveToCache(cacheKey, images);
        return images;

    } catch (error) {
        console.error('Error fetching from Unsplash:', error);
        return getFallbackImages(query);
    }
}

/**
 * Get a random image for a category (single image, not search results)
 * @param {string} category - Milestone category
 * @returns {Promise<Object|null>} - Single image object
 */
async function getRandomImageForCategory(category) {
    const queryMap = {
        'anniversary': 'romantic couple sunset love',
        'date': 'restaurant candlelight dinner',
        'trip': 'travel destination landscape',
        'achievement': 'celebration success confetti',
        'engagement': 'proposal ring wedding',
        'wedding': 'wedding ceremony bride groom',
        'birthday': 'birthday cake celebration',
        'home': 'house home family',
        'default': 'happy couple relationship'
    };

    const query = queryMap[category.toLowerCase()] || queryMap.default;
    const images = await fetchUnsplashImages(query, 'landscape', 1);
    return images.length > 0 ? images[0] : null;
}

/**
 * Get attribution HTML for Unsplash images (required by API terms)
 * @param {Object} image - Image object from Unsplash
 * @returns {string} - HTML attribution string
 */
function getImageAttribution(image) {
    return `
        <div class="unsplash-attribution">
            Photo by 
            <a href="${image.author.link}?utm_source=relationship_tracker&utm_medium=referral" target="_blank" rel="noopener noreferrer">
                ${image.author.name}
            </a> 
            on 
            <a href="https://unsplash.com/?utm_source=relationship_tracker&utm_medium=referral" target="_blank" rel="noopener noreferrer">
                Unsplash
            </a>
        </div>
    `;
}

// ========================
// CACHING FUNCTIONS
// ========================

function saveToCache(key, data) {
    try {
        const cache = {
            data: data,
            timestamp: Date.now(),
            expiry: CONFIG.unsplashCacheDuration
        };
        localStorage.setItem(`cache_${key}`, JSON.stringify(cache));
    } catch (error) {
        console.warn('Failed to save to cache:', error);
        // localStorage might be full
        clearOldCacheEntries();
    }
}

function getFromCache(key) {
    try {
        const cached = localStorage.getItem(`cache_${key}`);
        if (!cached) return null;

        const { data, timestamp, expiry } = JSON.parse(cached);

        // Check if cache is expired
        if (Date.now() - timestamp > expiry) {
            localStorage.removeItem(`cache_${key}`);
            return null;
        }

        return data;
    } catch (error) {
        console.warn('Failed to read from cache:', error);
        return null;
    }
}

function clearOldCacheEntries() {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('cache_')) {
            try {
                const cached = JSON.parse(localStorage.getItem(key));
                if (cached.timestamp < oneWeekAgo) {
                    localStorage.removeItem(key);
                }
            } catch (e) {
                // Skip invalid entries
            }
        }
    }
}

// ========================
// FALLBACK FUNCTIONS
// ========================

function getFallbackImages(query = 'love') {
    console.log('Using fallback images for:', query);

    const fallbackImages = [
        {
            id: 'fallback-1',
            urls: {
                thumb: 'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=200&h=200&fit=crop',
                small: 'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=400&h=300&fit=crop',
                regular: 'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=800&h=600&fit=crop',
                full: 'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=1200&h=900&fit=crop'
            },
            alt: 'Romantic couple silhouette at sunset',
            color: '#E75480',
            width: 1200,
            height: 900,
            author: {
                name: 'Unsplash Community',
                username: 'unsplash',
                link: 'https://unsplash.com',
                portfolio: 'https://unsplash.com'
            },
            isFallback: true
        }
        // Add more fallback images as needed
    ];

    return fallbackImages;
}

// ========================
// CALENDARIFIC API FUNCTIONS
// ========================

/**
 * Fetch holidays for a specific country and year
 * @param {string} country - Country code (e.g., 'US', 'GB')
 * @param {number} year - Year
 * @returns {Promise<Array>} - Array of holiday objects
 */
async function fetchHolidays(country = 'US', year = new Date().getFullYear()) {
    if (!CONFIG.calendarificKey) {
        console.warn('Calendarific API key not configured');
        return [];
    }

    const cacheKey = `holidays_${country}_${year}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    try {
        const url = new URL('https://calendarific.com/api/v2/holidays');
        url.searchParams.append('api_key', CONFIG.calendarificKey);
        url.searchParams.append('country', country);
        url.searchParams.append('year', year);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Calendarific API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.meta.code !== 200) {
            throw new Error(`Calendarific API error: ${data.meta.error_detail}`);
        }

        const holidays = data.response.holidays.map(holiday => ({
            name: holiday.name,
            description: holiday.description || '',
            date: new Date(holiday.date.iso),
            type: holiday.type || [],
            locations: holiday.locations || 'All',
            country: holiday.country.name
        }));

        // Cache for 24 hours
        const cacheData = {
            data: holidays,
            timestamp: Date.now(),
            expiry: 24 * 60 * 60 * 1000
        };
        localStorage.setItem(`cache_${cacheKey}`, JSON.stringify(cacheData));

        return holidays;

    } catch (error) {
        console.error('Error fetching holidays:', error);
        return getFallbackHolidays(country, year);
    }
}

function getFallbackHolidays(country, year) {
    // Common holidays as fallback
    const commonHolidays = [
        { name: "New Year's Day", date: new Date(year, 0, 1), type: ["Public"] },
        { name: "Valentine's Day", date: new Date(year, 1, 14), type: ["Observance"] },
        { name: "Christmas Day", date: new Date(year, 11, 25), type: ["Public"] }
    ];
    return commonHolidays;
}

// ========================
// EXPORT FUNCTIONS
// ========================

export {
    fetchUnsplashImages,
    getRandomImageForCategory,
    getImageAttribution,
    fetchHolidays,
    saveToCache,
    getFromCache
};