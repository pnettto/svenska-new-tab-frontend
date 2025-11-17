// CSV URL
const CSV_URL = 'https://raw.githubusercontent.com/pnettto/svenska-flashcards/refs/heads/main/flashcards/vocabulary-vardagslivert.csv';
const CACHE_KEY = 'swedishWords';

// Azure Speech Configuration
const SPEECH_KEY = 'YOUR_SPEECH_KEY_HERE';
const SPEECH_REGION = 'swedencentral';

let azureSynthesizer = null;
let currentWord = null;

// Initialize Azure Speech Synthesizer
function initializeSpeech() {
    if (typeof SpeechSDK === 'undefined') {
        console.error('Azure Speech SDK not loaded');
        return false;
    }
    
    try {
        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
            SPEECH_KEY,
            SPEECH_REGION
        );
        speechConfig.speechSynthesisVoiceName = 'sv-SE-SofieNeural';
        azureSynthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig);
        return true;
    } catch (error) {
        console.error('Error initializing speech:', error);
        return false;
    }
}

// Speak the Swedish word
function speakWord(text) {
    if (!azureSynthesizer) {
        console.error('Speech synthesizer not initialized');
        return;
    }
    
    azureSynthesizer.speakTextAsync(
        text,
        result => {
            if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                console.log('Speech synthesis succeeded');
            } else {
                console.error('Speech synthesis failed:', result.errorDetails);
            }
        },
        error => {
            console.error('Error during speech synthesis:', error);
        }
    );
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
    // Initialize speech synthesis
    initializeSpeech();
    
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
        translationElement.classList.toggle('hidden');
    });
    
    // Set up speak button click handler
    document.getElementById('speakBtn').addEventListener('click', () => {
        if (currentWord) {
            speakWord(currentWord.swedish);
        }
    });
    
    // Set up button click handler
    document.getElementById('newWordBtn').addEventListener('click', () => {
        const currentWords = localStorage.getItem(CACHE_KEY);
        if (currentWords) {
            const wordsArray = JSON.parse(currentWords);
            displayWord(getRandomWord(wordsArray));
        }
    });
}

// Start the extension
init();
