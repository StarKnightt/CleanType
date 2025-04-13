import React, { useState, useEffect, useCallback } from 'react';
import styles from './FullscreenEditor.module.css';

const STORAGE_KEY = 'freewrite-content';
const FONT_STORAGE_KEY = 'freewrite-font';
const SIZE_STORAGE_KEY = 'freewrite-size';

type FontStyle = 'lato' | 'arial' | 'system' | 'serif' | 'random';

const FONT_LABELS: Record<FontStyle, string> = {
  lato: 'Lato',
  arial: 'Arial',
  system: 'System',
  serif: 'Serif',
  random: 'Random'
};

const SIZE_PRESETS = ['16', '18', '20', '24', '28'];

const FullscreenEditor: React.FC = () => {
  const [content, setContent] = useState(() => {
    // Load saved content on startup
    return localStorage.getItem(STORAGE_KEY) || '';
  });

  const [currentFont, setCurrentFont] = useState<FontStyle>(() => {
    return (localStorage.getItem(FONT_STORAGE_KEY) as FontStyle) || 'system';
  });

  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem(SIZE_STORAGE_KEY) || '24';
  });

  const [isMaximized, setIsMaximized] = useState(true);
  const [selectionStart, setSelectionStart] = useState<number>(0);
  const [selectionEnd, setSelectionEnd] = useState<number>(0);

  // Auto-save content
  useEffect(() => {
    const saveContent = () => {
      localStorage.setItem(STORAGE_KEY, content);
    };

    // Save on content change with debounce
    const timeoutId = setTimeout(saveContent, 300);
    return () => clearTimeout(timeoutId);
  }, [content]);

  // Save font preference
  useEffect(() => {
    localStorage.setItem(FONT_STORAGE_KEY, currentFont);
  }, [currentFont]);

  // Save font size
  useEffect(() => {
    localStorage.setItem(SIZE_STORAGE_KEY, fontSize);
  }, [fontSize]);

  const handleZoom = useCallback((e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const currentSize = parseInt(fontSize);
      const newSize = e.deltaY < 0 
        ? Math.min(currentSize + 2, 72)  // Zoom in (max 72px)
        : Math.max(currentSize - 2, 8);   // Zoom out (min 8px)
      setFontSize(newSize.toString());
    }
  }, [fontSize]);

  // Add wheel event listener for zoom
  useEffect(() => {
    document.addEventListener('wheel', handleZoom, { passive: false });
    return () => document.removeEventListener('wheel', handleZoom);
  }, [handleZoom]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Save (Ctrl + S)
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
    }

    // Select All (Ctrl + A)
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      textarea.select();
    }

    // Undo (Ctrl + Z)
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      document.execCommand('undo');
    }

    // Redo (Ctrl + Y or Ctrl + Shift + Z)
    if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      document.execCommand('redo');
    }

    // Cut (Ctrl + X)
    if ((e.metaKey || e.ctrlKey) && e.key === 'x') {
      const textarea = e.target as HTMLTextAreaElement;
      const selectedText = content.substring(textarea.selectionStart, textarea.selectionEnd);
      if (selectedText) {
        navigator.clipboard.writeText(selectedText);
        const newContent = 
          content.substring(0, textarea.selectionStart) + 
          content.substring(textarea.selectionEnd);
        setContent(newContent);
        e.preventDefault();
      }
    }

    // Copy (Ctrl + C)
    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
      const textarea = e.target as HTMLTextAreaElement;
      const selectedText = content.substring(textarea.selectionStart, textarea.selectionEnd);
      if (selectedText) {
        navigator.clipboard.writeText(selectedText);
        e.preventDefault();
      }
    }

    // Paste (Ctrl + V)
    if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
      e.preventDefault();
      navigator.clipboard.readText().then(clipText => {
        const textarea = e.target as HTMLTextAreaElement;
        const newContent = 
          content.substring(0, textarea.selectionStart) + 
          clipText + 
          content.substring(textarea.selectionEnd);
        setContent(newContent);
      });
    }

    // Find (Ctrl + F)
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault();
      // We'll implement find functionality later
    }

    // New Document (Ctrl + N)
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();
      if (content && window.confirm('Do you want to start a new document? Any unsaved changes will be lost.')) {
        setContent('');
      }
    }

    // Maximize/Minimize (F11)
    if (e.key === 'F11') {
      e.preventDefault();
      setIsMaximized(!isMaximized);
    }

    // Escape to clear selection
    if (e.key === 'Escape') {
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value && parseInt(value) > 0) {
      setFontSize(value);
    }
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    setSelectionStart(textarea.selectionStart);
    setSelectionEnd(textarea.selectionEnd);
  };

  return (
    <div className={styles.container}>
      <div className={styles.bottomNav}>
        <div className={styles.leftControls}>
          <div className={styles.sizeWrapper}>
            <input
              type="text"
              value={fontSize + 'px'}
              onChange={handleSizeChange}
              className={styles.sizeInput}
            />
            <div className={styles.sizePresets}>
              {SIZE_PRESETS.map(size => (
                <button
                  key={size}
                  className={styles.sizePreset}
                  onClick={() => setFontSize(size)}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>
          <span className={styles.navDot}>•</span>
          {Object.entries(FONT_LABELS).map(([font, label]) => (
            <React.Fragment key={font}>
              <button
                className={`${styles.fontOption} ${currentFont === font ? styles.active : ''}`}
                onClick={() => setCurrentFont(font as FontStyle)}
              >
                {label}
              </button>
              <span className={styles.navDot}>•</span>
            </React.Fragment>
          ))}
        </div>

        <div className={styles.rightControls}>
          <button className={styles.navButton}>
            New Entry
          </button>
          <span className={styles.navDot}>•</span>
          <button className={styles.navButton}>
            History
          </button>
          <span className={styles.navDot}>•</span>
          <div className={styles.timer}>00:00</div>
          <span className={styles.navDot}>•</span>
          <button 
            className={styles.navButton}
            onClick={() => setIsMaximized(!isMaximized)}
          >
            {isMaximized ? 'Minimize' : 'Maximize'}
          </button>
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        onSelect={handleSelect}
        className={`${styles.editor} ${styles[`font-${currentFont}`]}`}
        style={{ fontSize: `${fontSize}px` }}
        spellCheck={false}
        autoFocus
        placeholder="Start writing..."
      />
    </div>
  );
};

export default FullscreenEditor; 