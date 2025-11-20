// Examples generation and management utilities
import { audio } from './audio.js';

export const examples = {
    // Fetch new examples from the API
    async fetch(proxyUrl, word, translation, existingExamples = [], wordId = null) {
        const requestBody = {
            swedishWord: word,
            englishTranslation: translation,
            ...(existingExamples.length > 0 && { existingExamples })
        };
        
        // Add wordId if it exists
        if (wordId) {
            requestBody.wordId = wordId;
        }
        
        const response = await fetch(`${proxyUrl}/api/generate-examples`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        return await response.json();
    },

    // Preload audio for a list of examples
    preloadAudio(examplesList, word, proxyUrl) {
        examplesList.forEach((example, index) => {
            audio.preloadExample(example, word, index, proxyUrl);
        });
    }
};
