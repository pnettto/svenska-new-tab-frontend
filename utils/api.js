// API utility functions for interacting with the backend
export const api = {
    BASE_URL: localStorage.getItem('apiBaseUrl') || 'https://svenska-new-tab-backend.fly.dev',

    // Get all words
    async getAllWords() {
        try {
            const response = await fetch(`${this.BASE_URL}/api/words`);
            if (!response.ok) {
                throw new Error(`Failed to fetch words: ${response.status}`);
            }
            const data = await response.json();
            return data.words;
        } catch (error) {
            console.error('Error fetching words:', error);
            return null;
        }
    },

    // Get single word by ID
    async getWord(id) {
        try {
            const response = await fetch(`${this.BASE_URL}/api/words/${id}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch word: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching word:', error);
            return null;
        }
    },

    // Create new word
    async createWord(original, translation, examples = []) {
        try {
            const response = await fetch(`${this.BASE_URL}/api/words`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    original,
                    translation,
                    examples
                })
            });
            if (!response.ok) {
                throw new Error(`Failed to create word: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error creating word:', error);
            return null;
        }
    },

    // Update word
    async updateWord(id, original, translation, examples = []) {
        try {
            const response = await fetch(`${this.BASE_URL}/api/words/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    original,
                    translation,
                    examples
                })
            });
            if (!response.ok) {
                throw new Error(`Failed to update word: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error updating word:', error);
            return null;
        }
    },

    // Delete word
    async deleteWord(id) {
        try {
            const response = await fetch(`${this.BASE_URL}/api/words/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error(`Failed to delete word: ${response.status}`);
            }
            return true;
        } catch (error) {
            console.error('Error deleting word:', error);
            return false;
        }
    },

    // Increment read count
    async incrementReadCount(id) {
        try {
            const response = await fetch(`${this.BASE_URL}/api/words/${id}/increment-read`, {
                method: 'POST'
            });
            if (!response.ok) {
                throw new Error(`Failed to increment read count: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error incrementing read count:', error);
            return null;
        }
    },

    // Get statistics
    async getStats() {
        try {
            const response = await fetch(`${this.BASE_URL}/api/stats`);
            if (!response.ok) {
                throw new Error(`Failed to fetch stats: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching stats:', error);
            return null;
        }
    },

    // Shuffle array using Fisher-Yates algorithm
    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },

    // Generate speech for a word and cache it
    async generateWordSpeech(text, wordId) {
        try {
            const response = await fetch(`${this.BASE_URL}/api/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text,
                    ...(wordId && { wordId })
                })
            });
            
            if (!response.ok) {
                throw new Error(`TTS API error: ${response.status}`);
            }
            
            const audioBlob = await response.blob();
            const speechFile = response.headers.get('X-Speech-File');
            
            return {
                audioBlob,
                speechFile
            };
        } catch (error) {
            console.error('Error generating word speech:', error);
            return null;
        }
    },

    // Get cached audio by filename
    getSpeechUrl(filename) {
        return `${this.BASE_URL}/api/speech/${filename}`;
    },

    // Generate speech for an example sentence
    async generateExampleSpeech(wordId, exampleIndex, exampleText) {
        try {
            const response = await fetch(`${this.BASE_URL}/api/generate-example-speech`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wordId,
                    exampleIndex,
                    exampleText
                })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to generate example speech: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error generating example speech:', error);
            return null;
        }
    }
};
