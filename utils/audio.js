// Audio playback utilities
export const audio = {
    cache: {},
    audioObjectCache: {},
    currentAudio: null,

    // Preload audio for a word using cached speech file if available
    async preloadWord(word, proxyUrl) {
        const cacheKey = word.speech || word.original;
        
        if (this.cache[cacheKey]) {
            return;
        }
        
        try {
            let audioUrl;
            
            if (word.speech) {
                // Use cached audio directly from the speech endpoint
                audioUrl = `${proxyUrl}/api/speech/${word.speech}`;
                this.cache[cacheKey] = audioUrl;
            } else {
                // Generate and cache audio
                const response = await fetch(`${proxyUrl}/api/tts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        text: word.original,
                        wordId: word.id || word._id
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`TTS API error: ${response.status}`);
                }
                
                const audioBlob = await response.blob();
                audioUrl = URL.createObjectURL(audioBlob);
                this.cache[cacheKey] = audioUrl;
                
                // Update word object with the filename for future use
                const speechFile = response.headers.get('X-Speech-File');
                if (speechFile && (word.id || word._id)) {
                    word.speech = speechFile;
                }
            }
        } catch (error) {
            console.error('Error preloading word audio:', error);
        }
    },

    // Preload audio for an example using cached speech file if available
    async preloadExample(example, word, exampleIndex, proxyUrl) {
        const cacheKey = example.speech || example.swedish;
        
        if (this.cache[cacheKey]) {
            return;
        }
        
        try {
            if (example.speech) {
                // Use cached audio directly
                const audioUrl = `${proxyUrl}/api/speech/${example.speech}`;
                this.cache[cacheKey] = audioUrl;
            } else {
                // Will be generated on first play
            }
        } catch (error) {
            console.error('Error preloading example audio:', error);
        }
    },

    // Play audio for a word
    async playWord(word, proxyUrl) {
        // Stop any currently playing audio
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        
        try {
            const cacheKey = word.speech || word.original;
            let audioUrl = this.cache[cacheKey];
            
            if (!audioUrl) {
                if (word.speech) {
                    // Use cached audio directly from the speech endpoint
                    audioUrl = `${proxyUrl}/api/speech/${word.speech}`;
                    this.cache[cacheKey] = audioUrl;
                } else {
                    // Generate and cache audio
                    const response = await fetch(`${proxyUrl}/api/tts`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            text: word.original,
                            wordId: word.id || word._id
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`TTS API error: ${response.status}`);
                    }
                    
                    const audioBlob = await response.blob();
                    audioUrl = URL.createObjectURL(audioBlob);
                    this.cache[cacheKey] = audioUrl;
                    
                    // Update word object with the filename for future use
                    const speechFile = response.headers.get('X-Speech-File');
                    if (speechFile && (word.id || word._id)) {
                        word.speech = speechFile;
                    }
                }
            }
            
            this.currentAudio = new Audio(audioUrl);
            await this.currentAudio.play();
            console.log('Word audio playback started');
            
        } catch (error) {
            console.error('Error during word speech synthesis:', error);
            alert('Failed to play audio. Make sure your proxy server is running.');
        }
    },

    // Play audio for an example
    async playExample(example, word, exampleIndex, proxyUrl) {
        // Stop any currently playing audio
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        
        try {
            const cacheKey = example.speech || example.swedish;
            let audioUrl = this.cache[cacheKey];
            
            if (!audioUrl) {
                if (example.speech) {
                    // Use cached audio directly from the speech endpoint
                    audioUrl = `${proxyUrl}/api/speech/${example.speech}`;
                    this.cache[cacheKey] = audioUrl;
                } else {
                    // If word has an ID, use the generate-example-speech endpoint
                    if (word && (word.id || word._id)) {
                        const response = await fetch(`${proxyUrl}/api/generate-example-speech`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                wordId: word.id || word._id,
                                exampleIndex: exampleIndex,
                                exampleText: example.swedish
                            })
                        });
                        
                        if (!response.ok) {
                            throw new Error(`Example TTS API error: ${response.status}`);
                        }
                        
                        const result = await response.json();
                        // Update the example object with the speech filename
                        // The backend has already saved this to the database
                        example.speech = result.speechFilename;
                        
                        audioUrl = `${proxyUrl}/api/speech/${result.speechFilename}`;
                        this.cache[cacheKey] = audioUrl;
                        // Also cache with the new key
                        this.cache[example.speech] = audioUrl;
                    } else {
                        // Fallback: use regular TTS endpoint for words without ID
                        const response = await fetch(`${proxyUrl}/api/tts`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: example.swedish })
                        });
                        
                        if (!response.ok) {
                            throw new Error(`TTS API error: ${response.status}`);
                        }
                        
                        const audioBlob = await response.blob();
                        audioUrl = URL.createObjectURL(audioBlob);
                        this.cache[cacheKey] = audioUrl;
                    }
                }
            }
            
            this.currentAudio = new Audio(audioUrl);
            await this.currentAudio.play();
            console.log('Example audio playback started');
            
        } catch (error) {
            console.error('Error during example speech synthesis:', error);
            console.error('Word:', word, 'Example:', example, 'Index:', exampleIndex);
            alert('Failed to play example audio. Make sure your proxy server is running.');
        }
    },

    // Legacy method for backward compatibility (text-based TTS without caching)
    async play(text, proxyUrl) {
        // Stop any currently playing audio
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        
        try {
            let audioUrl = this.cache[text];
            
            if (!audioUrl) {
                const response = await fetch(`${proxyUrl}/api/tts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });
                
                if (!response.ok) {
                    throw new Error(`TTS API error: ${response.status}`);
                }
                
                const audioBlob = await response.blob();
                audioUrl = URL.createObjectURL(audioBlob);
                this.cache[text] = audioUrl;
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
