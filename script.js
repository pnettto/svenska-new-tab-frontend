// CSV URL
const CSV_URL = 'words.csv';
const CACHE_KEY = 'swedishWords';

// Azure Speech Configuration
const SPEECH_KEY = localStorage.getItem('SPEECH_KEY');
const SPEECH_REGION = 'swedencentral';

let azureSynthesizer = null;
let currentWord = null;
let useAzureSpeech = false;

// Initialize Azure Speech Synthesizer
function initializeSpeech() {
    if (typeof SpeechSDK === 'undefined') {
        console.warn('Azure Speech SDK not loaded, will use browser speech synthesis');
        return false;
    }
    
    try {
        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
            SPEECH_KEY,
            SPEECH_REGION
        );
        speechConfig.speechSynthesisVoiceName = 'sv-SE-SofieNeural';
        azureSynthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig);
        useAzureSpeech = true;
        return true;
    } catch (error) {
        console.warn('Error initializing Azure speech, will use browser speech synthesis:', error);
        return false;
    }
}

// Speak using browser's built-in speech synthesis
function speakWithBrowser(text) {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'sv-SE';
        utterance.rate = 0.9;
        
        // Try to find a Swedish voice
        const voices = window.speechSynthesis.getVoices();
        const swedishVoice = voices.find(voice => voice.lang.startsWith('sv'));
        if (swedishVoice) {
            utterance.voice = swedishVoice;
        }
        
        window.speechSynthesis.speak(utterance);
        console.log('Using browser speech synthesis');
    } else {
        console.error('Browser speech synthesis not supported');
    }
}

// Speak the Swedish word using Azure Speech or browser fallback
function speakWord(text) {
    if (useAzureSpeech && azureSynthesizer) {
        // Stop any ongoing synthesis by recreating the synthesizer
        try {
            azureSynthesizer.close();
        } catch (e) {
            console.warn('Error closing synthesizer:', e);
        }
        
        // Recreate the synthesizer
        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
            SPEECH_KEY,
            SPEECH_REGION
        );
        speechConfig.speechSynthesisVoiceName = 'sv-SE-SofieNeural';
        azureSynthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig);
        
        azureSynthesizer.speakTextAsync(
            text,
            result => {
                if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                    console.log('Azure speech synthesis succeeded');
                } else {
                    console.error('Azure speech synthesis failed:', result.errorDetails);
                    // Fallback to browser speech on error
                    speakWithBrowser(text);
                }
            },
            error => {
                console.error('Error during Azure speech synthesis:', error);
                // Fallback to browser speech on error
                speakWithBrowser(text);
            }
        );
    } else {
        // Use browser speech synthesis as fallback
        speakWithBrowser(text);
    }
}
// Parse CSV data into array of word objects
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const words = [];
    
    for (let line of lines) {
        const [swedish, english] = line.split(',').map(s => s.trim());
        if (swedish && english) {
            words.push({ swedish, english });
        }
    }
    
    return words;
}

// Get a random word from the array
function getRandomWord(words) {
    return words[Math.floor(Math.random() * words.length)];
}

// Display a word on the page
function displayWord(word) {
    currentWord = word;
    document.getElementById('swedishWord').textContent = word.swedish;
    const translationElement = document.getElementById('englishTranslation');
    translationElement.textContent = word.english;
    translationElement.classList.add('hidden');
}

function displayNewWord() {
    const currentWords = localStorage.getItem(CACHE_KEY);
    if (currentWords) {
        const wordsArray = JSON.parse(currentWords);
        displayWord(getRandomWord(wordsArray));
    }
}

// Fetch words from CSV and update cache
async function fetchAndCacheWords() {
    try {
        const response = await fetch(CSV_URL);
        const csvText = await response.text();
        const words = parseCSV(csvText);
        
        // Save to localStorage
        localStorage.setItem(CACHE_KEY, JSON.stringify(words));
        
        return words;
    } catch (error) {
        console.error('Error fetching words:', error);
        return null;
    }
}

// Initialize the extension
async function init() {
    // Initialize Azure speech synthesis
    initializeSpeech();
    
    // Load voices for browser speech synthesis fallback
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        // Some browsers need this event to load voices
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.getVoices();
        };
    }
    
    // Try to get cached words first for immediate display
    let words = null;
    const cachedWords = localStorage.getItem(CACHE_KEY);

    
    if (cachedWords) {
        try {
            words = JSON.parse(cachedWords);
            // Display a random word immediately from cache
            displayWord(getRandomWord(words));
        } catch (error) {
            console.error('Error parsing cached words:', error);
        }
    }
    
    // Fetch fresh words in the background to update cache
    const freshWords = await fetchAndCacheWords();
    
    // If we didn't have cached words, display now
    if (!words && freshWords) {
        words = freshWords;
        displayWord(getRandomWord(words));
    }
    
    // Set up click handler for Swedish word to reveal translation
    document.getElementById('swedishWord').addEventListener('click', () => {
        const translationElement = document.getElementById('englishTranslation');
        if (translationElement.classList.contains('hidden')) {
            translationElement.classList.remove('hidden')
            speakWord(currentWord.swedish);
        } else {
            displayNewWord()
        }
    });
    
    // Set up click handler for play button
    document.getElementById('playBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentWord) {
            speakWord(currentWord.swedish);
        }
    });
}

// Start the extension
init();
