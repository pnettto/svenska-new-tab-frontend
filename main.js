import { html } from './htm.js';
import { render } from './libs/preact.module.js';
import { useState, useEffect } from './hooks.js';
import { WordCard, ButtonGroup, ExamplesSection, CustomWordModal } from './components.js';
import { storage } from './utils/storage.js';
import { audio } from './utils/audio.js';
import { api } from './utils/api.js';

function App() {
  const [currentWord, setCurrentWord] = useState(null);
  const [translationRevealed, setTranslationRevealed] = useState(false);
  const [wordHistory, setWordHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [shuffledWords, setShuffledWords] = useState([]);
  const [shuffledIndex, setShuffledIndex] = useState(0);
  const [isGeneratingExamples, setIsGeneratingExamples] = useState(false);
  const [examples, setExamples] = useState([]);
  const [showExamples, setShowExamples] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const proxyUrl = storage.getProxyUrl();

  // Initialize app
  useEffect(() => {
    // Wake up proxy server (non-blocking)
    fetch(`${proxyUrl}/health`).catch(error => {
      console.warn('Failed to wake up proxy server:', error);
    });

    // Try to get cached words first
    const cachedWords = storage.getCachedWords();
    if (cachedWords) {
      const shuffled = api.shuffle(cachedWords);
      setShuffledWords(shuffled);
      setShuffledIndex(0);
      displayWord(shuffled[0]);
      setShuffledIndex(1);
    }

    // Fetch fresh words from API in background
    api.getAllWords().then(freshWords => {
      if (freshWords) {
        storage.saveWords(freshWords);
        
        if (!cachedWords) {
          const shuffled = api.shuffle(freshWords);
          setShuffledWords(shuffled);
          setShuffledIndex(0);
          displayWord(shuffled[0]);
          setShuffledIndex(1);
        }
      }
    });
  }, []);

  const displayWord = (word, addToHistory = true) => {
    setCurrentWord(word);
    setTranslationRevealed(false);
    setShowExamples(false);
    setExamples([]);

    if (addToHistory) {
      setWordHistory(prev => {
        const newHistory = historyIndex < prev.length - 1 
          ? prev.slice(0, historyIndex + 1) 
          : prev;
        return [...newHistory, { ...word, examples: word.examples || [] }];
      });
      setHistoryIndex(prev => prev + 1);
      
      // Increment read count via API
      if (word.id) {
        api.incrementReadCount(word.id).catch(error => {
          console.warn('Failed to increment read count:', error);
        });
      }
    } else {
      if (word.examples && word.examples.length > 0) {
        setExamples(word.examples);
        setShowExamples(true);
      }
    }

    audio.preload(word.original, proxyUrl);
  };

  const displayNewWord = () => {
    if (shuffledIndex < shuffledWords.length) {
      displayWord(shuffledWords[shuffledIndex]);
      setShuffledIndex(prev => prev + 1);
    } else {
      const reshuffled = api.shuffle(shuffledWords);
      setShuffledWords(reshuffled);
      setShuffledIndex(0);
      displayWord(reshuffled[0]);
      setShuffledIndex(1);
    }
  };

  const handleWordClick = () => {
    if (isGeneratingExamples) return;

    if (!translationRevealed) {
      setTranslationRevealed(true);
      audio.play(currentWord.original, proxyUrl);
    } else {
      displayNewWord();
    }
  };

  const handlePlayAudio = () => {
    if (currentWord) {
      audio.play(currentWord.original, proxyUrl);
    }
  };

  const handleGenerateExamples = async () => {
    if (!currentWord || isGeneratingExamples) return;

    // If examples are already showing, generate new ones and append
    if (showExamples && examples.length > 0) {
      setIsGeneratingExamples(true);

      try {
        const response = await fetch(`${proxyUrl}/api/generate-examples`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            swedishWord: currentWord.original,
            englishTranslation: currentWord.translation,
            existingExamples: examples  // Pass existing examples to avoid duplicates
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const data = await response.json();
        const updatedExamples = [...data.examples, ...examples];
        setExamples(updatedExamples);

        // Update word in API with all examples
        if (currentWord.id) {
          await api.updateWord(
            currentWord.id,
            currentWord.original,
            currentWord.translation,
            updatedExamples
          );
        }
        
        setWordHistory(prev => {
          const newHistory = [...prev];
          if (historyIndex >= 0 && historyIndex < newHistory.length) {
            newHistory[historyIndex].examples = updatedExamples;
          }
          return newHistory;
        });

        data.examples.forEach(example => {
          audio.preload(example.swedish, proxyUrl);
        });

      } catch (error) {
        console.error('Error generating examples:', error);
        alert(`Failed to generate examples: ${error.message}\n\nMake sure your proxy server is running.`);
      } finally {
        setIsGeneratingExamples(false);
      }
      return;
    }

    // First click: check if examples exist in database
    if (currentWord.examples && currentWord.examples.length > 0) {
      setExamples(currentWord.examples);
      setShowExamples(true);
      currentWord.examples.forEach(example => {
        audio.preload(example.swedish, proxyUrl);
      });
      return;
    }

    // No existing examples, generate new ones
    setIsGeneratingExamples(true);
    setShowExamples(false);

    try {
      const response = await fetch(`${proxyUrl}/api/generate-examples`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          swedishWord: currentWord.original,
          englishTranslation: currentWord.translation
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setExamples(data.examples);

      // Update word in API with examples
      if (currentWord.id) {
        await api.updateWord(
          currentWord.id,
          currentWord.original,
          currentWord.translation,
          data.examples
        );
      }
      
      setWordHistory(prev => {
        const newHistory = [...prev];
        if (historyIndex >= 0 && historyIndex < newHistory.length) {
          newHistory[historyIndex].examples = data.examples;
        }
        return newHistory;
      });

      data.examples.forEach(example => {
        audio.preload(example.swedish, proxyUrl);
      });

      setShowExamples(true);

    } catch (error) {
      console.error('Error generating examples:', error);
      alert(`Failed to generate examples: ${error.message}\n\nMake sure your proxy server is running.`);
    } finally {
      setIsGeneratingExamples(false);
    }
  };

  const handlePrevious = () => {
    if (isGeneratingExamples || historyIndex <= 0) return;
    
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    displayWord(wordHistory[newIndex], false);
  };

  const handleNext = () => {
    if (isGeneratingExamples) return;

    if (historyIndex < wordHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      displayWord(wordHistory[newIndex], false);
    } else {
      displayNewWord();
    }
  };

  const handlePlayExample = (text) => {
    audio.play(text, proxyUrl);
  };

  const handleSubmitCustomWord = async (swedish) => {
    if (!swedish.trim()) {
      alert('Vänligen fyll i ett svenskt ord / Please enter a Swedish word');
      return;
    }

    setIsTranslating(true);

    try {
      const response = await fetch(`${proxyUrl}/api/translate`, {
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
      
      // Create word in API
      const newWord = await api.createWord(swedish, data.translation, []);
      if (!newWord) {
        throw new Error('Failed to create word in database');
      }

      setShuffledWords(prev => {
        const newWords = [...prev];
        if (newWords.length > 0) {
          newWords.splice(shuffledIndex, 0, newWord);
        } else {
          newWords.push(newWord);
        }
        return newWords;
      });

      setModalOpen(false);
      displayWord(newWord);
      setShuffledIndex(prev => prev + 1);

    } catch (error) {
      console.error('Error translating word:', error);
      alert('Kunde inte hämta översättning / Failed to fetch translation. Make sure your proxy server is running.');
    } finally {
      setIsTranslating(false);
    }
  };

  const canGoPrevious = historyIndex > 0 && !isGeneratingExamples;

  return html`
    <div>
      <button 
        class="add-word-btn" 
        onClick=${() => setModalOpen(true)}
        title="Add custom word"
      >
        +
      </button>
      
      <${CustomWordModal}
        isOpen=${modalOpen}
        onClose=${() => setModalOpen(false)}
        onSubmit=${handleSubmitCustomWord}
        isTranslating=${isTranslating}
      />
      
      <div class="container">
        <${WordCard}
          word=${currentWord}
          onWordClick=${handleWordClick}
          translationRevealed=${translationRevealed}
        />
        
        <${ButtonGroup}
          onPrevious=${handlePrevious}
          onPlay=${handlePlayAudio}
          onGenerateExamples=${handleGenerateExamples}
          onNext=${handleNext}
          canGoPrevious=${canGoPrevious}
          isGeneratingExamples=${isGeneratingExamples}
          showExamples=${showExamples}
        />
        
        <${ExamplesSection}
          examples=${examples}
          showExamples=${showExamples}
          isGeneratingExamples=${isGeneratingExamples}
          translationRevealed=${translationRevealed}
          onPlayExample=${handlePlayExample}
        />
      </div>
    </div>
  `;
}

// Render the app
render(html`<${App} />`, document.body);
