// LocalStorage utility functions
export const storage = {
    CACHE_KEY: 'swedishWords',

    // Get cached words
    getCachedWords() {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Error reading cached words:', error);
            return null;
        }
    },

    // Save words to cache
    saveWords(words) {
        try {
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(words));
        } catch (error) {
            console.error('Error saving words:', error);
        }
    },

    // Get proxy API URL
    getProxyUrl() {
        return localStorage.getItem('apiBaseUrl') || 'https://svenska-new-tab-backend.fly.dev';
    }
};
