// LocalStorage utility functions
export const storage = {
    CACHE_KEY: 'swedishWords',
    EXAMPLES_CACHE_KEY: 'swedishExamples',
    WORD_COUNTER_KEY: 'swedishWordCounter',

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

    // Get counter data
    getCounterData() {
        try {
            const counter = localStorage.getItem(this.WORD_COUNTER_KEY);
            return counter ? JSON.parse(counter) : {};
        } catch (error) {
            console.error('Error reading word counter:', error);
            return {};
        }
    },

    // Save counter data
    saveCounterData(counter) {
        try {
            localStorage.setItem(this.WORD_COUNTER_KEY, JSON.stringify(counter));
        } catch (error) {
            console.error('Error saving word counter:', error);
        }
    },

    // Increment word counter
    incrementWordCounter(swedishWord) {
        const key = this.getWordKey(swedishWord);
        const counter = this.getCounterData();
        counter[key] = (counter[key] || 0) + 1;
        this.saveCounterData(counter);
    },

    // Get word count
    getWordCount(swedishWord) {
        const key = this.getWordKey(swedishWord);
        const counter = this.getCounterData();
        return counter[key] || 0;
    },

    // Get cached examples
    getCachedExamples(swedishWord) {
        try {
            const cache = localStorage.getItem(this.EXAMPLES_CACHE_KEY);
            if (cache) {
                const examplesCache = JSON.parse(cache);
                return examplesCache[swedishWord] || null;
            }
            return null;
        } catch (error) {
            console.error('Error loading cached examples:', error);
            return null;
        }
    },

    // Save examples to cache
    saveExamples(swedishWord, examples) {
        try {
            let cache = {};
            const existingCache = localStorage.getItem(this.EXAMPLES_CACHE_KEY);
            if (existingCache) {
                cache = JSON.parse(existingCache);
            }
            cache[swedishWord] = examples;
            localStorage.setItem(this.EXAMPLES_CACHE_KEY, JSON.stringify(cache));
        } catch (error) {
            console.error('Error saving examples to cache:', error);
        }
    },

    // Get proxy API URL
    getProxyUrl() {
        return localStorage.getItem('PROXY_API_URL') || 'https://svenska-new-tab-backend.fly.dev';
    },

    // Normalize word to use as key
    getWordKey(swedishWord) {
        return swedishWord.toLowerCase().replace(/\s+/g, '_');
    }
};
