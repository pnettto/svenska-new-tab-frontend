import { storage } from './utils/storage.js';
import { audio } from './utils/audio.js';
import { csv } from './utils/csv.js';

class SvenskaApp {
    constructor() {
        // State
        this.currentWord = null;
        this.translationRevealed = false;
        this.wordHistory = [];
        this.historyIndex = -1;
        this.shuffledWords = [];
        this.shuffledIndex = 0;
        this.isGeneratingExamples = false;
        this.examples = [];
        this.proxyUrl = storage.getProxyUrl();

        // DOM elements
        this.elements = {};
        
        // Bind methods
        this.handleWordClick = this.handleWordClick.bind(this);
        this.playAudio = this.playAudio.bind(this);
        this.generateExamples = this.generateExamples.bind(this);
        this.goToPrevious = this.goToPrevious.bind(this);
        this.goToNext = this.goToNext.bind(this);
        this.openModal = this.openModal.bind(this);
        this.closeModal = this.closeModal.bind(this);
        this.submitCustomWord = this.submitCustomWord.bind(this);
        this.handleCustomWordKeydown = this.handleCustomWordKeydown.bind(this);
    }

    // Initialize DOM references
    initElements() {
        this.elements = {
            swedishWord: document.getElementById('swedishWord'),
            englishTranslation: document.getElementById('englishTranslation'),
            prevBtn: document.getElementById('prevBtn'),
            playBtn: document.getElementById('playBtn'),
            generateBtn: document.getElementById('generateBtn'),
            nextBtn: document.getElementById('nextBtn'),
            examplesContainer: document.getElementById('examplesContainer'),
            examplesList: document.getElementById('examplesList'),
            loading: document.getElementById('loading'),
            modal: document.getElementById('customWordModal'),
            customSwedish: document.getElementById('customSwedish'),
            submitBtn: document.getElementById('submitWordBtn'),
            cancelBtn: document.getElementById('cancelBtn'),
            loadingTranslation: document.getElementById('loadingTranslation'),
            addWordBtn: document.getElementById('addWordBtn')
        };
    }

    // Setup event listeners
    setupEventListeners() {
        this.elements.swedishWord.addEventListener('click', this.handleWordClick);
        this.elements.playBtn.addEventListener('click', this.playAudio);
        this.elements.generateBtn.addEventListener('click', this.generateExamples);
        this.elements.prevBtn.addEventListener('click', this.goToPrevious);
        this.elements.nextBtn.addEventListener('click', this.goToNext);
        this.elements.addWordBtn.addEventListener('click', this.openModal);
        this.elements.cancelBtn.addEventListener('click', this.closeModal);
        this.elements.submitBtn.addEventListener('click', this.submitCustomWord);
        this.elements.customSwedish.addEventListener('keydown', this.handleCustomWordKeydown);
        this.elements.modal.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) this.closeModal();
        });
    }

    // Initialize the app
    async init() {
        this.initElements();
        this.setupEventListeners();

        // Wake up proxy server (non-blocking)
        fetch(`${this.proxyUrl}/health`).catch(error => {
            console.warn('Failed to wake up proxy server:', error);
        });

        // Try to get cached words first
        const cachedWords = storage.getCachedWords();
        if (cachedWords) {
            this.shuffledWords = csv.shuffle(cachedWords);
            this.shuffledIndex = 0;
            this.displayWord(this.shuffledWords[this.shuffledIndex]);
            this.shuffledIndex++;
        }

        // Fetch fresh words in background
        const freshWords = await csv.fetch();
        if (freshWords) {
            storage.saveWords(freshWords);
            
            if (!cachedWords) {
                this.shuffledWords = csv.shuffle(freshWords);
                this.shuffledIndex = 0;
                this.displayWord(this.shuffledWords[this.shuffledIndex]);
                this.shuffledIndex++;
            }
        }
    }

    // Display a word
    displayWord(word, addToHistory = true) {
        this.currentWord = word;
        this.translationRevealed = false;
        
        this.elements.swedishWord.textContent = word.swedish;
        this.elements.englishTranslation.textContent = word.english;
        this.elements.englishTranslation.classList.add('hidden');
        
        this.elements.loading.classList.add('hidden');
        this.elements.generateBtn.disabled = false;
        this.elements.examplesContainer.classList.add('hidden');
        this.examples = [];

        if (addToHistory) {
            if (this.historyIndex < this.wordHistory.length - 1) {
                this.wordHistory = this.wordHistory.slice(0, this.historyIndex + 1);
            }
            this.wordHistory.push({ ...word, examples: null });
            this.historyIndex = this.wordHistory.length - 1;
            storage.incrementWordCounter(word.swedish);
        } else {
            if (word.examples) {
                this.examples = word.examples;
                this.displayExamples(word.examples);
            }
        }

        audio.preload(word.swedish, this.proxyUrl);
        this.updateNavigationButtons();
    }

    // Display next word
    displayNewWord() {
        if (this.shuffledIndex < this.shuffledWords.length) {
            this.displayWord(this.shuffledWords[this.shuffledIndex]);
            this.shuffledIndex++;
        } else {
            this.shuffledWords = csv.shuffle(this.shuffledWords);
            this.shuffledIndex = 0;
            this.displayWord(this.shuffledWords[this.shuffledIndex]);
            this.shuffledIndex++;
        }
    }

    // Handle word click
    handleWordClick() {
        if (this.isGeneratingExamples) return;

        if (!this.translationRevealed) {
            this.elements.englishTranslation.classList.remove('hidden');
            this.translationRevealed = true;
            audio.play(this.currentWord.swedish, this.proxyUrl);
            
            // Show English translations in examples if visible
            if (!this.elements.examplesContainer.classList.contains('hidden')) {
                this.elements.examplesContainer.querySelectorAll('.example-english')
                    .forEach(el => el.classList.remove('hidden'));
            }
        } else {
            this.displayNewWord();
        }
    }

    // Play audio
    playAudio() {
        if (this.currentWord) {
            audio.play(this.currentWord.swedish, this.proxyUrl);
        }
    }

    // Generate examples
    async generateExamples() {
        if (!this.currentWord || this.isGeneratingExamples) return;

        this.isGeneratingExamples = true;
        this.elements.generateBtn.disabled = true;
        this.elements.prevBtn.disabled = true;
        this.elements.nextBtn.disabled = true;
        this.elements.loading.classList.remove('hidden');
        this.elements.examplesContainer.classList.add('hidden');

        try {
            const response = await fetch(`${this.proxyUrl}/api/generate-examples`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    swedishWord: this.currentWord.swedish,
                    englishTranslation: this.currentWord.english
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const data = await response.json();
            this.examples = data.examples;

            storage.saveExamples(this.currentWord.swedish, this.examples);
            if (this.historyIndex >= 0 && this.historyIndex < this.wordHistory.length) {
                this.wordHistory[this.historyIndex].examples = this.examples;
            }

            this.examples.forEach(example => {
                audio.preload(example.swedish, this.proxyUrl);
            });

            this.displayExamples(this.examples);

        } catch (error) {
            console.error('Error generating examples:', error);
            alert(`Failed to generate examples: ${error.message}\n\nMake sure your proxy server is running.`);
        } finally {
            this.isGeneratingExamples = false;
            this.elements.loading.classList.add('hidden');
            this.elements.generateBtn.disabled = false;
            this.updateNavigationButtons();
        }
    }

    // Display examples
    displayExamples(examples) {
        this.elements.examplesList.innerHTML = '';

        examples.forEach(example => {
            const exampleItem = document.createElement('div');
            exampleItem.className = 'example-item';

            const swedishText = document.createElement('div');
            swedishText.className = 'example-swedish';
            swedishText.textContent = '🔊 ' + example.swedish;
            swedishText.style.cursor = 'pointer';
            swedishText.title = 'Click to hear pronunciation';
            swedishText.addEventListener('click', () => {
                audio.play(example.swedish, this.proxyUrl);
            });

            const englishText = document.createElement('div');
            englishText.className = 'example-english';
            englishText.textContent = example.english;
            if (!this.translationRevealed) {
                englishText.classList.add('hidden');
            }

            exampleItem.appendChild(swedishText);
            exampleItem.appendChild(englishText);
            this.elements.examplesList.appendChild(exampleItem);
        });

        this.elements.examplesContainer.classList.remove('hidden');
    }

    // Navigate to previous word
    goToPrevious() {
        if (this.isGeneratingExamples || this.historyIndex <= 0) return;
        
        this.historyIndex--;
        this.displayWord(this.wordHistory[this.historyIndex], false);
    }

    // Navigate to next word
    goToNext() {
        if (this.isGeneratingExamples) return;

        if (this.historyIndex < this.wordHistory.length - 1) {
            this.historyIndex++;
            this.displayWord(this.wordHistory[this.historyIndex], false);
        } else {
            this.displayNewWord();
        }
    }

    // Update navigation buttons
    updateNavigationButtons() {
        this.elements.prevBtn.disabled = this.historyIndex <= 0 || this.isGeneratingExamples;
        this.elements.nextBtn.disabled = this.isGeneratingExamples;
    }

    // Open modal
    openModal() {
        this.elements.modal.classList.remove('hidden');
        this.elements.customSwedish.focus();
    }

    // Close modal
    closeModal() {
        this.elements.modal.classList.add('hidden');
        this.elements.customSwedish.value = '';
        this.elements.loadingTranslation.classList.add('hidden');
    }

    // Submit custom word
    async submitCustomWord() {
        const swedish = this.elements.customSwedish.value.trim();
        
        if (!swedish) {
            alert('Vänligen fyll i ett svenskt ord / Please enter a Swedish word');
            return;
        }

        this.elements.submitBtn.disabled = true;
        this.elements.cancelBtn.disabled = true;
        this.elements.customSwedish.disabled = true;
        this.elements.loadingTranslation.classList.remove('hidden');

        try {
            const response = await fetch(`${this.proxyUrl}/api/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: swedish,
                    sourceLang: 'sv',
                    targetLang: 'en'
                })
            });

            if (!response.ok) {
                throw new Error(`Translation API error: ${response.status}`);
            }

            const data = await response.json();
            const customWord = { swedish, english: data.translation };

            if (this.shuffledWords.length > 0) {
                this.shuffledWords.splice(this.shuffledIndex, 0, customWord);
            } else {
                this.shuffledWords.push(customWord);
                this.shuffledIndex = 0;
            }

            this.closeModal();
            this.displayWord(customWord);
            this.shuffledIndex++;

        } catch (error) {
            console.error('Error translating word:', error);
            alert('Kunde inte hämta översättning / Failed to fetch translation. Make sure your proxy server is running.');
        } finally {
            this.elements.submitBtn.disabled = false;
            this.elements.cancelBtn.disabled = false;
            this.elements.customSwedish.disabled = false;
            this.elements.loadingTranslation.classList.add('hidden');
        }
    }

    // Handle Enter key in custom word input
    handleCustomWordKeydown(event) {
        if (event.key === 'Enter') {
            this.submitCustomWord();
        }
    }
}

// Initialize app when DOM is ready
const app = new SvenskaApp();
app.init();
