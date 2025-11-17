// CSV URL
const CSV_URL = 'https://raw.githubusercontent.com/pnettto/svenska-flashcards/refs/heads/main/flashcards/vocabulary-vardagslivert.csv';
const CACHE_KEY = 'swedishWords';

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
