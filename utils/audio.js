// Audio playback utilities
export const audio = {
    cache: {},
    currentAudio: null,

    // Generate audio using /api/tts and return the speech filename
    async generateAudio(text, proxyUrl) {
        try {
            const response = await fetch(`${proxyUrl}/api/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            
            if (!response.ok) {
                throw new Error(`TTS API error: ${response.status}`);
            }
            
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const speechFile = response.headers.get('X-Speech-File');
            
            // Cache the audio
            if (speechFile) {
                this.cache[speechFile] = audioUrl;
            }
            this.cache[text] = audioUrl;
            
            return { audioUrl, speechFile };
        } catch (error) {
            console.error('Error generating audio:', error);
            throw error;
        }
    },

    // Get audio URL (from cache or speech endpoint)
    getAudioUrl(speechFilename, proxyUrl) {
        if (this.cache[speechFilename]) {
            return this.cache[speechFilename];
        }
        
        const audioUrl = `${proxyUrl}/api/speech/${speechFilename}`;
        this.cache[speechFilename] = audioUrl;
        return audioUrl;
    },

    // Preload audio for a word
    async preloadWord(word, proxyUrl) {
        const cacheKey = word.speech || word.original;
        
        if (this.cache[cacheKey]) {
            return;
        }
        
        try {
            if (word.speech) {
                // Use cached audio from speech endpoint
                this.getAudioUrl(word.speech, proxyUrl);
            } else {
                // Generate new audio
                await this.generateAudio(word.original, proxyUrl);
            }
        } catch (error) {
            console.error('Error preloading word audio:', error);
        }
    },

    // Preload audio for an example
    async preloadExample(example, proxyUrl) {
        const cacheKey = example.speech || example.swedish;
        
        if (this.cache[cacheKey]) {
            return;
        }
        
        try {
            if (example.speech) {
                // Use cached audio from speech endpoint
                this.getAudioUrl(example.speech, proxyUrl);
            } else {
                // Generate new audio
                await this.generateAudio(example.swedish, proxyUrl);
            }
        } catch (error) {
            console.error('Error preloading example audio:', error);
        }
    },

    // Play audio for a word
    async playWord(word, proxyUrl) {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        
        try {
            let audioUrl;
            
            if (word.speech) {
                audioUrl = this.getAudioUrl(word.speech, proxyUrl);
            } else {
                const result = await this.generateAudio(word.original, proxyUrl);
                audioUrl = result.audioUrl;
                
                // Update word with speech filename if available
                if (result.speechFile && word._id) {
                    word.speech = result.speechFile;
                    // Persist to backend
                    this.updateWordSpeech(word._id, result.speechFile, proxyUrl).catch(err => {
                        console.warn('Failed to update word speech in backend:', err);
                    });
                }
            }
            
            this.currentAudio = new Audio(audioUrl);
            await this.currentAudio.play();
            console.log('Word audio playback started');
            
        } catch (error) {
            console.error('Error playing word audio:', error);
            alert('Failed to play audio. Make sure your proxy server is running.');
        }
    },

    // Play audio for an example
    async playExample(example, word, exampleIndex, proxyUrl) {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        
        try {
            let audioUrl;
            
            if (example.speech) {
                audioUrl = this.getAudioUrl(example.speech, proxyUrl);
            } else {
                const result = await this.generateAudio(example.swedish, proxyUrl);
                audioUrl = result.audioUrl;
                
                // Update example with speech filename if available
                if (result.speechFile && word?._id) {
                    example.speech = result.speechFile;
                    // Persist to backend
                    this.updateExampleSpeech(word._id, exampleIndex, result.speechFile, proxyUrl).catch(err => {
                        console.warn('Failed to update example speech in backend:', err);
                    });
                }
            }
            
            this.currentAudio = new Audio(audioUrl);
            await this.currentAudio.play();
            console.log('Example audio playback started');
            
        } catch (error) {
            console.error('Error playing example audio:', error);
            alert('Failed to play example audio. Make sure your proxy server is running.');
        }
    },

    // Update word speech field in backend
    async updateWordSpeech(wordId, speechFile, proxyUrl) {
        try {
            const response = await fetch(`${proxyUrl}/api/words/${wordId}/speech`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ speech: speechFile })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to update word speech: ${response.status}`);
            }
            
            console.log(`Updated word ${wordId} with speech file: ${speechFile}`);
        } catch (error) {
            console.error('Error updating word speech:', error);
            throw error;
        }
    },

    // Update example speech field in backend
    async updateExampleSpeech(wordId, exampleIndex, speechFile, proxyUrl) {
        try {
            const response = await fetch(`${proxyUrl}/api/words/${wordId}/examples/${exampleIndex}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ speech: speechFile })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to update example speech: ${response.status}`);
            }
            
            console.log(`Updated word ${wordId} example ${exampleIndex} with speech file: ${speechFile}`);
        } catch (error) {
            console.error('Error updating example speech:', error);
            throw error;
        }
    },

    // Legacy method for backward compatibility
    async play(text, proxyUrl) {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        
        try {
            let audioUrl = this.cache[text];
            
            if (!audioUrl) {
                const result = await this.generateAudio(text, proxyUrl);
                audioUrl = result.audioUrl;
            }
            
            this.currentAudio = new Audio(audioUrl);
            await this.currentAudio.play();
            console.log('TTS playback started');
            
        } catch (error) {
            console.error('Error during speech synthesis:', error);
            alert('Failed to play audio. Make sure your proxy server is running.');
        }
    }
};
