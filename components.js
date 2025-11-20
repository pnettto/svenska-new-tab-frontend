import { html } from './htm.js';
import { useState, useEffect, useRef } from './hooks.js';

export function WordCard({ word, onWordClick, translationRevealed }) {
  if (!word) return null;

  return html`
    <div class="word-card">
      <h1 
        class="swedish-word" 
        onClick=${onWordClick}
      >
        ${word.original}
      </h1>
      <p 
        class="english-translation ${translationRevealed ? '' : 'hidden'}"
      >
        ${word.translation}
      </p>
    </div>
  `;
}

export function ButtonGroup({ 
  onPrevious, 
  onPlay, 
  onGenerateExamples, 
  onNext,
  canGoPrevious,
  isGeneratingExamples,
  showExamples
}) {
  return html`
    <div class="button-group">
      <button 
        class="btn" 
        onClick=${onPrevious}
        disabled=${!canGoPrevious}
        title="Previous word"
      >
        ←
      </button>
      <button 
        class="btn" 
        onClick=${onPlay}
        title="Play audio"
      >
        Lyssna
      </button>
      <button 
        class="btn" 
        onClick=${onGenerateExamples}
        disabled=${isGeneratingExamples}
        title=${showExamples ? "Generate more examples" : "Show examples"}
      >
        ${showExamples ? 'Fler' : 'Exampel'}
      </button>
      <button 
        class="btn" 
        onClick=${onNext}
        disabled=${isGeneratingExamples}
        title="Next word"
      >
        →
      </button>
    </div>
  `;
}

export function ExamplesSection({ 
  examples, 
  showExamples, 
  isGeneratingExamples, 
  translationRevealed,
  onPlayExample 
}) {
  return html`
    <div class="examples-section">
      ${showExamples && html`
        <div class="examples-container">
          <h3>Exampelmeningar:</h3>
          <div class="examples-list">
            ${examples.map(example => html`
              <div class="example-item" key=${example.swedish}>
                <div 
                  class="example-swedish"
                  onClick=${() => onPlayExample(example.swedish)}
                  style="cursor: pointer;"
                  title="Click to hear pronunciation"
                >
                  🔊 ${example.swedish}
                </div>
                <div class="example-english ${translationRevealed ? '' : 'hidden'}">
                  ${example.english}
                </div>
              </div>
            `)}
          </div>
        </div>
      `}
      
      ${isGeneratingExamples && html`
        <div class="loading">Generera exempel...</div>
      `}
    </div>
  `;
}

export function CustomWordModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  isTranslating 
}) {
  const inputRef = useRef();
  const [customSwedish, setCustomSwedish] = useState('');

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = () => {
    onSubmit(customSwedish);
    setCustomSwedish('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleClose = () => {
    setCustomSwedish('');
    onClose();
  };

  if (!isOpen) return null;

  return html`
    <div class="modal" onClick=${(e) => e.target.classList.contains('modal') && handleClose()}>
      <div class="modal-content">
        <h2>Lägg till eget ord</h2>
        <div class="input-group">
          <label for="customSwedish">Svenska ord:</label>
          <input 
            ref=${inputRef}
            type="text" 
            id="customSwedish"
            value=${customSwedish}
            onInput=${(e) => setCustomSwedish(e.target.value)}
            onKeyDown=${handleKeyDown}
            disabled=${isTranslating}
            placeholder="t.ex. hund"
          />
        </div>
        <div class="modal-buttons">
          <button 
            class="btn-secondary" 
            onClick=${handleClose}
            disabled=${isTranslating}
          >
            Avbryt
          </button>
          <button 
            class="btn-primary" 
            onClick=${handleSubmit}
            disabled=${isTranslating}
          >
            Lägg till
          </button>
        </div>
        ${isTranslating && html`
          <div class="loading-translation">Hämtar översättning...</div>
        `}
      </div>
    </div>
  `;
}
