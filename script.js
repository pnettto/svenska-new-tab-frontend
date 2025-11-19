// CSV URL
const CSV_URL = 'words.csv';
const CACHE_KEY = 'swedishWords';
const EXAMPLES_CACHE_KEY = 'swedishExamples';
const WORD_COUNTER_KEY = 'swedishWordCounter';

// Azure Speech Configuration
const SPEECH_KEY = localStorage.getItem('SPEECH_KEY');
const SPEECH_REGION = 'swedencentral';

// OpenAI Configuration
const OPENAI_API_KEY = localStorage.getItem('OPENAI_API_KEY');
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

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

// Normalize word to use as key
function getWordKey(swedishWord) {
    return swedishWord.toLowerCase().replace(/\s+/g, '_');
}

// Get counter data from localStorage
function getCounterData() {
    try {
        const existingCounter = localStorage.getItem(WORD_COUNTER_KEY);
        return existingCounter ? JSON.parse(existingCounter) : {};
    } catch (error) {
        console.error('Error reading word counter:', error);
        return {};
    }
}

// Save counter data to localStorage
function saveCounterData(counter) {
    try {
        localStorage.setItem(WORD_COUNTER_KEY, JSON.stringify(counter));
    } catch (error) {
        console.error('Error saving word counter:', error);
    }
}

// Increment word counter in localStorage
function incrementWordCounter(swedishWord) {
    const key = getWordKey(swedishWord);
    const counter = getCounterData();
    counter[key] = (counter[key] || 0) + 1;
    saveCounterData(counter);
}

// Get how many times a word has been seen
function getWordCount(swedishWord) {
    const key = getWordKey(swedishWord);
    const counter = getCounterData();
    return counter[key] || 0;
}

// Display a word on the page
function displayWord(word) {
    currentWord = word;
    document.getElementById('swedishWord').textContent = word.swedish;
    const translationElement = document.getElementById('englishTranslation');
    translationElement.textContent = word.english;
    translationElement.classList.add('hidden');
    
    // Reset examples section
    document.getElementById('examplesContainer').classList.add('hidden');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('generateBtn').disabled = false;
    
    // Increment the counter for this word
    incrementWordCounter(word.swedish);
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
    
    // Set up click handler for generate examples button
    document.getElementById('generateBtn').addEventListener('click', async () => {
        if (currentWord && OPENAI_API_KEY) {
            await generateExamples(currentWord.swedish, currentWord.english);
        } else if (!OPENAI_API_KEY) {
            alert('Please set your OpenAI API key in localStorage:\nlocalStorage.setItem("OPENAI_API_KEY", "your-api-key")');
        }
    });
}

// OpenAI Functions

// Load cached examples if available
function loadCachedExamples(swedishWord) {
    try {
        const cache = localStorage.getItem(EXAMPLES_CACHE_KEY);
        if (cache) {
            const examplesCache = JSON.parse(cache);
            if (examplesCache[swedishWord]) {
                displayExamples(examplesCache[swedishWord]);
            }
        }
    } catch (error) {
        console.error('Error loading cached examples:', error);
    }
}

// Save examples to cache
function saveExamplesToCache(swedishWord, examples) {
    try {
        let cache = {};
        const existingCache = localStorage.getItem(EXAMPLES_CACHE_KEY);
        if (existingCache) {
            cache = JSON.parse(existingCache);
        }
        cache[swedishWord] = examples;
        localStorage.setItem(EXAMPLES_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
        console.error('Error saving examples to cache:', error);
    }
}

// Generate examples using OpenAI
async function generateExamples(swedishWord, englishTranslation) {
    const generateBtn = document.getElementById('generateBtn');
    const loading = document.getElementById('loading');
    const examplesContainer = document.getElementById('examplesContainer');
    
    // Show loading state
    generateBtn.disabled = true;
    loading.classList.remove('hidden');
    examplesContainer.classList.add('hidden');
    
    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a Swedish language teacher helping students learn Swedish. Generate simple, practical example sentences that demonstrate how to use Swedish words in everyday contexts. Each example should be at A2-B1 level (beginner to intermediate).'
                    },
                    {
                        role: 'user',
                        content: `Generate 3 example sentences using the Swedish word "${swedishWord}" (which means "${englishTranslation}" in English). For each example, provide:
1. The Swedish sentence
2. The English translation

Format your response as a JSON array with objects containing "swedish" and "english" properties. Example format:
[{"swedish": "...", "english": "..."}, {"swedish": "...", "english": "..."}, {"swedish": "...", "english": "..."}]

Make the sentences natural, practical, and at beginner-intermediate level.`
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });
        
        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // Parse the JSON response
        let examples;
        try {
            // Try to extract JSON from the response (in case it's wrapped in markdown code blocks)
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                examples = JSON.parse(jsonMatch[0]);
            } else {
                examples = JSON.parse(content);
            }
        } catch (parseError) {
            console.error('Error parsing OpenAI response:', parseError);
            throw new Error('Failed to parse examples from OpenAI response');
        }
        
        // Save to cache
        saveExamplesToCache(swedishWord, examples);
        
        // Display examples
        displayExamples(examples);
        
    } catch (error) {
        console.error('Error generating examples:', error);
        alert('Failed to generate examples. Please check your API key and try again.');
    } finally {
        loading.classList.add('hidden');
        generateBtn.disabled = false;
    }
}

// Display examples on the page
function displayExamples(examples) {
    const examplesContainer = document.getElementById('examplesContainer');
    const examplesList = document.getElementById('examplesList');
    
    // Clear existing examples
    examplesList.innerHTML = '';
    
    // Add each example
    examples.forEach(example => {
        const exampleItem = document.createElement('div');
        exampleItem.className = 'example-item';
        
        const swedishText = document.createElement('div');
        swedishText.className = 'example-swedish';
        swedishText.textContent = '🔊 ' + example.swedish;
        swedishText.style.cursor = 'pointer';
        swedishText.title = 'Click to hear pronunciation';
        
        // Add click handler to speak the Swedish sentence
        swedishText.addEventListener('click', () => {
            speakWord(example.swedish);
        });
        
        const englishText = document.createElement('div');
        englishText.className = 'example-english';
        englishText.textContent = example.english;
        
        exampleItem.appendChild(swedishText);
        exampleItem.appendChild(englishText);
        examplesList.appendChild(exampleItem);
    });
    
    // Show the examples container
    examplesContainer.classList.remove('hidden');
}

// Start the extension
init();
