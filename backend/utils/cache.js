const cache = new Map();

/**
 * Caches the result of an asynchronous function in memory.
 * 
 * @param {string} key - The unique cache key for the query
 * @param {number} ttlSeconds - Time-to-live in seconds
 * @param {Function} fetchFunction - The async function that fetches the data if it's not cached
 * @returns {Promise<any>} - The cached or freshly fetched data
 */
const withCache = async (key, ttlSeconds, fetchFunction) => {
    const now = Date.now();
    const cachedItem = cache.get(key);

    if (cachedItem && cachedItem.expiry > now) {
        return cachedItem.data;
    }

    // Cache miss or expired, fetch new data
    const data = await fetchFunction();
    
    // Store in cache
    cache.set(key, {
        data,
        expiry: now + (ttlSeconds * 1000)
    });

    return data;
};

/**
 * Warm up cache for products, orders, categories, and banners.
 * @param {any} db - The MongoDB Database instance
 */
const warmUpCache = async (db) => {
    if (!db) return;
    try {
        cache.clear();
        console.log("Warming up cache for products, orders, categories, and banners...");

        // 1. Warm up Banners (TTL 300 seconds = 5 min)
        const bannersCollection = db.collection("banners");
        await withCache("banners", 300, async () => {
            return await bannersCollection.find({}).sort({ createdAt: -1 }).toArray();
        });

        // 2. Warm up Categories (TTL 300 seconds = 5 min)
        const categoriesCollection = db.collection("categories");
        await withCache("categories_null_null_", 300, async () => {
            return await categoriesCollection.find({}).sort({ sortOrder: 1, name: 1 }).toArray();
        });

        // 3. Warm up Products (Recent 50 products for quick home page load, TTL 120 seconds)
        const productsCollection = db.collection("products");
        await withCache("products_1_12_newest", 120, async () => {
            const products = await productsCollection.find({})
                .project({ 
                    description: 0, 
                    dimensions: 0, 
                    reviews: 0, 
                    images: 0, 
                    warrantyInformation: 0, 
                    shippingInformation: 0, 
                    returnPolicy: 0, 
                    tags: 0,
                    sku: 0,
                    weight: 0,
                    availabilityStatus: 0,
                    minimumOrderQuantity: 0
                })
                .sort({ _id: -1 })
                .limit(50)
                .toArray();
            return {
                totalProducts: products.length,
                products
            };
        });

        console.log("Cache warming completed successfully!");
    } catch (error) {
        console.error("Error warming up cache:", error);
    }
};

/**
 * Clears cache keys. If a key or prefix pattern is provided, clears matching keys.
 * If no key is provided, clears only expired items instead of wiping everything.
 * @param {string} [keyOrPrefix] 
 */
const clearCache = (keyOrPrefix) => {
    if (!keyOrPrefix) {
        // Clear only expired keys instead of nuking the whole cache
        const now = Date.now();
        for (const [key, item] of cache.entries()) {
            if (item.expiry <= now) {
                cache.delete(key);
            }
        }
        return;
    }

    if (cache.has(keyOrPrefix)) {
        cache.delete(keyOrPrefix);
        return;
    }

    // Delete keys matching the prefix pattern (e.g., 'products', 'categories')
    const lowerPattern = keyOrPrefix.toLowerCase();
    for (const key of cache.keys()) {
        if (key.toLowerCase().includes(lowerPattern)) {
            cache.delete(key);
        }
    }
};

module.exports = {
    withCache,
    clearCache,
    warmUpCache
};
