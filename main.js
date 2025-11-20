import { html } from './htm.js';
import { render } from './libs/preact.module.js';
import { useState, useEffect } from './hooks.js';
import { WordCard, ButtonGroup, ExamplesSection, CustomWordModal } from './components.js';
import { storage } from './utils/storage.js';
import { audio } from './utils/audio.js';
import { api } from './utils/api.js';
import { examples as examplesService } from './utils/examples.js';
import { words } from './utils/words.js';

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
    words.initialize(proxyUrl, storage).then(initialWords => {
      if (initialWords) {
        setShuffledWords(initialWords);
        setShuffledIndex(0);
        displayWord(initialWords[0]);
        setShuffledIndex(1);
      }
    });

    // Fetch fresh words in background
    api.getAllWords().then(freshWords => {
      if (freshWords) {
        storage.saveWords(freshWords);
        const shuffled = api.shuffle(freshWords);
        setShuffledWords(shuffled);
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
      if (word.id || word._id) {
        api.incrementReadCount(word.id || word._id).catch(error => {
          console.warn('Failed to increment read count:', error);
        });
      }
    } else {
      if (word.examples && word.examples.length > 0) {
        setExamples(word.examples);
        setShowExamples(true);
      }
    }

    // Preload audio for the word using speech caching
    audio.preloadWord(word, proxyUrl);
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
      audio.playWord(currentWord, proxyUrl);
    } else {
      displayNewWord();
    }
  };

  const handlePlayAudio = () => {
    if (currentWord) {
      audio.playWord(currentWord, proxyUrl);
    }
  };

  const updateExamplesInHistory = (newExamples) => {
    setWordHistory(prev => {
      const newHistory = [...prev];
      if (historyIndex >= 0 && historyIndex < newHistory.length) {
        newHistory[historyIndex].examples = newExamples;
      }
      return newHistory;
    });
  };

  const handleGenerateExamples = async () => {
    if (!currentWord || isGeneratingExamples) return;

    // Show existing examples if available
    if (!showExamples && currentWord.examples?.length > 0) {
      setExamples(currentWord.examples);
      setShowExamples(true);
      examplesService.preloadAudio(currentWord.examples, currentWord, proxyUrl);
      return;
    }

    // Generate new examples
    setIsGeneratingExamples(true);
    if (!showExamples) setShowExamples(false);

    try {
      const data = await examplesService.fetch(
        proxyUrl,
        currentWord.original,
        currentWord.translation,
        showExamples ? examples : [],
        currentWord.id || currentWord._id
      );
      const updatedExamples = showExamples ? [...data.examples, ...examples] : data.examples;
      
      setExamples(updatedExamples);
      
      if (currentWord.id || currentWord._id) {
        await api.updateWord(
          currentWord.id || currentWord._id,
          currentWord.original,
          currentWord.translation,
          updatedExamples
        );
      }
      
      updateExamplesInHistory(updatedExamples);
      examplesService.preloadAudio(data.examples, currentWord, proxyUrl);
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

  const handlePlayExample = (example, exampleIndex) => {
    audio.playExample(example, currentWord, exampleIndex, proxyUrl);
  };

  const handleSubmitCustomWord = async (swedish) => {
    if (!swedish.trim()) {
      alert('Vänligen fyll i ett svenskt ord / Please enter a Swedish word');
      return;
    }

    setIsTranslating(true);

    try {
      const translation = await words.translate(proxyUrl, swedish);
      const newWord = await api.createWord(swedish, translation, []);
      
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
