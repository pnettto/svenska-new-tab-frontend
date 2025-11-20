// Audio playback utilities
export const audio = {
    cache: {},
    currentAudio: null,

    // Preload audio for a word
    async preload(text, proxyUrl) {
        if (this.cache[text]) {
            return;
        }
        
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
            this.cache[text] = URL.createObjectURL(audioBlob);
        } catch (error) {
            console.error('Error preloading audio:', error);
        }
    },

    // Play audio for text
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
