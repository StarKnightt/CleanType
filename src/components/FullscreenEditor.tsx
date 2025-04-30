import React, { useState, useEffect, useRef } from 'react';
import styles from './FullscreenEditor.module.css';
import { toast, Toaster } from 'react-hot-toast';
import { Timer } from './Timer';
import { appWindow } from '@tauri-apps/api/window';
import { HistoryPanel } from './HistoryPanel';

interface FullscreenEditorProps {
  isDarkTheme: boolean;
  onThemeToggle: () => void;
}

const STORAGE_KEY = 'freewrite-content';
const FONT_STORAGE_KEY = 'freewrite-font';
const SIZE_STORAGE_KEY = 'freewrite-size';
const ENTRIES_KEY = 'freewrite-entries';

interface Entry {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  font: FontStyle;
  fontSize: string;
  theme: Theme;
}

type FontStyle = 'lato' | 'arial' | 'system' | 'serif' | 'script' | 'elegant' | 'classic' | 'playpen' | 'random';
type Theme = 'dark' | 'light';

const FONT_LABELS: Record<FontStyle, string> = {
  lato: 'Sans',
  arial: 'Mono',
  system: 'Inter',
  serif: 'Serif',
  script: 'Script',
  elegant: 'Elegant',
  classic: 'Classic',
  playpen: 'Playpen',
  random: 'Random'
};

const SIZE_PRESETS = ['16', '18', '20', '24', '28', '32', '36', '42', '48'];

const FONT_CATEGORIES = {
  basic: ['system', 'lato', 'arial', 'serif'] as FontStyle[],
  calligraphy: ['playpen', 'script', 'elegant', 'classic'] as FontStyle[],
  special: ['random'] as FontStyle[]
};

export const FullscreenEditor: React.FC<FullscreenEditorProps> = ({ isDarkTheme, onThemeToggle }) => {
  const [content, setContent] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || '';
  });

  const [currentEntry, setCurrentEntry] = useState<Entry | null>(() => {
    const savedContent = localStorage.getItem(STORAGE_KEY);
    if (savedContent) {
      return {
        id: 'current',
        content: savedContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title: 'Untitled',
        font: 'system',
        fontSize: '24',
        theme: 'light'
      };
    }
    return null;
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [entries, setEntries] = useState<Entry[]>(() => {
    return JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]');
  });

  const [currentFont, setCurrentFont] = useState<FontStyle>(() => {
    return (localStorage.getItem(FONT_STORAGE_KEY) as FontStyle) || 'system';
  });

  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem(SIZE_STORAGE_KEY) || '28';
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [wordCount, setWordCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Load entries when component mounts
  useEffect(() => {
    const savedEntries = localStorage.getItem(ENTRIES_KEY);
    if (savedEntries) {
      setEntries(JSON.parse(savedEntries));
    }
  }, []);

  // Add word count calculation
  useEffect(() => {
    const words = content.trim().split(/\s+/);
    setWordCount(content.trim() ? words.length : 0);
  }, [content]);

  // Auto-save content without notification
  useEffect(() => {
    const saveContent = () => {
      if (currentEntry) {
        localStorage.setItem(STORAGE_KEY, content);
        const updatedEntry: Entry = {
          ...currentEntry,
          content,
          updatedAt: new Date().toISOString(),
          font: currentFont,
          fontSize: fontSize,
          theme: isDarkTheme ? 'dark' : 'light' as Theme
        };
        
        const newEntries = [...entries];
        const index = newEntries.findIndex(e => e.id === currentEntry.id);
        if (index >= 0) {
          newEntries[index] = updatedEntry;
          setEntries(newEntries);
          localStorage.setItem(ENTRIES_KEY, JSON.stringify(newEntries));
        }
      }
    };
    const timeoutId = setTimeout(saveContent, 300);
    return () => clearTimeout(timeoutId);
  }, [content, currentEntry]);

  // Manual save with notification (Ctrl + S)
  const handleSave = async () => {
    if (currentEntry && content.trim()) {
      try {
        const updatedEntry: Entry = {
          ...currentEntry,
          content,
          updatedAt: new Date().toISOString(),
          font: currentFont,
          fontSize: fontSize,
          theme: isDarkTheme ? 'dark' : 'light'
        };
        
        const newEntries = entries.filter(e => e.id !== currentEntry.id);
        newEntries.unshift(updatedEntry);
        setEntries(newEntries);
        localStorage.setItem(ENTRIES_KEY, JSON.stringify(newEntries));
        setHasUnsavedChanges(false);
        
        toast.success('Saved to history', {
          duration: 2000,
          style: {
            background: isDarkTheme ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.95)',
            color: isDarkTheme ? '#fff' : '#333',
          }
        });
      } catch (error) {
        console.error('Failed to save:', error);
        toast.error('Failed to save to history');
      }
    }
  };

  // Track unsaved changes
  useEffect(() => {
    if (currentEntry && currentEntry.content !== content) {
      setHasUnsavedChanges(true);
    }
  }, [content, currentEntry]);

  // Save font preference
  useEffect(() => {
    localStorage.setItem(FONT_STORAGE_KEY, currentFont);
  }, [currentFont]);

  // Save font size
  useEffect(() => {
    localStorage.setItem(SIZE_STORAGE_KEY, fontSize);
  }, [fontSize]);

  useEffect(() => {
    if (content !== undoStack[undoStack.length - 1]) {
      setUndoStack(prev => [...prev, content]);
      setRedoStack([]);
    }
  }, [content]);

  const handleWheel = (e: React.WheelEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -2 : 2;
      const newSize = Math.min(Math.max(parseInt(fontSize) + delta, 12), 72);
      setFontSize(newSize.toString());
      
      toast.success(`Font size: ${newSize}px`, {
        duration: 1000,
        position: 'bottom-center',
        style: {
          background: isDarkTheme ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
          color: isDarkTheme ? '#fff' : '#333',
          fontSize: '13px',
          padding: '8px 12px',
        }
      });
    }
  };

  const toggleTheme = () => {
    onThemeToggle();
  };

  const createNewEntry = () => {
    const newEntry: Entry = {
      id: Date.now().toString(),
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: 'Untitled',
      font: currentFont,
      fontSize: fontSize,
      theme: isDarkTheme ? 'dark' : 'light'
    };
    
    setCurrentEntry(newEntry);
    setContent('');
    setHasUnsavedChanges(false);
    
    const newEntries = [newEntry, ...entries];
    setEntries(newEntries);
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(newEntries));
    toast.success('New entry created', {
      duration: 2000,
      style: {
        background: isDarkTheme ? 'rgba(0, 0, 0, 0.85)' : '#ffffff',
        color: isDarkTheme ? '#fff' : '#333',
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Save to history (Ctrl + S)
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
      return;
    }

    // New Document (Ctrl + N)
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();
      createNewEntry();
      return;
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
      if (undoStack.length > 1) {
        const newUndoStack = [...undoStack];
        const currentState = newUndoStack.pop()!;
        const previousState = newUndoStack[newUndoStack.length - 1];
        
        setUndoStack(newUndoStack);
        setRedoStack(prev => [...prev, currentState]);
        setContent(previousState);
      }
      return;
    }

    // Redo (Ctrl + Y or Ctrl + Shift + Z)
    if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      if (redoStack.length > 0) {
        const newRedoStack = [...redoStack];
        const nextState = newRedoStack.pop()!;
        
        setRedoStack(newRedoStack);
        setUndoStack(prev => [...prev, nextState]);
        setContent(nextState);
      }
      return;
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

    // Escape to clear selection
    if (e.key === 'Escape') {
      window.getSelection()?.removeAllRanges();
    }

    // F11 handler
    if (e.key === 'F11') {
      e.preventDefault();
      const toggleFullscreen = async () => {
        try {
          const isFullscreen = await appWindow.isFullscreen();
          await appWindow.setFullscreen(!isFullscreen);
          toast.success(isFullscreen ? 'Exited fullscreen' : 'Entered fullscreen', {
            duration: 2000,
            position: 'bottom-center',
            style: {
              background: isDarkTheme ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
              color: isDarkTheme ? '#fff' : '#333',
              fontSize: '13px',
              padding: '8px 12px',
            }
          });
        } catch (error) {
          console.error('Failed to toggle fullscreen:', error);
          toast.error('Failed to toggle fullscreen mode');
        }
      };
      toggleFullscreen();
    }
  };

  const handleSelect = () => {
    // No need to track selection
  };

  // Simple rotating placeholders
  const placeholders = [
    "Start writing your story...",
    "What's on your mind today?",
    "Share your thoughts and dreams...",
    "Write about your favorite memory...",
    "What are your goals for today?",
    "Describe a place you'd love to visit...",
    "Write a letter to your future self..."
  ];

  const [currentPlaceholder, setCurrentPlaceholder] = useState(placeholders[0]);

  // Simple placeholder rotation
  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % placeholders.length;
      setCurrentPlaceholder(placeholders[currentIndex]);
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            setIsTimerActive(false);
            toast.success('Timer completed!');
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeLeft]);

  const startTimer = (minutes: number) => {
    setTimeLeft(minutes * 60);
    setIsTimerActive(true);
    toast.success(`Timer started: ${minutes} minutes`);
  };

  const pauseTimer = () => {
    setIsTimerActive(false);
    toast.success('Timer paused');
  };

  const resumeTimer = () => {
    if (timeLeft > 0) {
      setIsTimerActive(true);
      toast.success('Timer resumed');
    }
  };

  const resetTimer = () => {
    setTimeLeft(0);
    setIsTimerActive(false);
    toast.success('Timer reset');
  };

  // Random font button
  const randomizeFont = () => {
    const fonts: FontStyle[] = [...FONT_CATEGORIES.basic, ...FONT_CATEGORIES.calligraphy];
    const currentIndex = fonts.indexOf(currentFont);
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * fonts.length);
    } while (newIndex === currentIndex);
    setCurrentFont(fonts[newIndex]);
  };

  const handleHistoryToggle = () => {
    setIsHistoryOpen(prev => !prev);
  };

  // Auto-save effect
  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      if (currentEntry && content.trim()) {
        const updatedEntry: Entry = {
          ...currentEntry,
          content,
          updatedAt: new Date().toISOString(),
          font: currentFont,
          fontSize: fontSize,
          theme: isDarkTheme ? 'dark' : 'light'
        };
        
        const newEntries = entries.filter(e => e.id !== currentEntry.id);
        newEntries.unshift(updatedEntry);
        setEntries(newEntries);
        localStorage.setItem(ENTRIES_KEY, JSON.stringify(newEntries));
        localStorage.setItem(STORAGE_KEY, content);
        setHasUnsavedChanges(false);
      }
    }, 300); // Even faster auto-save

    return () => clearTimeout(saveTimeout);
  }, [content, currentEntry, currentFont, fontSize, isDarkTheme]);

  // Simplified content change handler
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setHasUnsavedChanges(true);
  };

  return (
    <div className={`${styles.editorContainer} ${isDarkTheme ? styles.darkTheme : styles.lightTheme}`}>
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 2000,
          style: {
            background: isDarkTheme ? '#333' : '#fff',
            color: isDarkTheme ? '#fff' : '#333',
          }
        }}
      />
      <div className={styles.wordCount}>
        {wordCount} {wordCount === 1 ? 'word' : 'words'}
      </div>
      <button
        className={styles.newEntryButton}
        onClick={createNewEntry}
        title="Create new entry"
      >
        +
      </button>
      <textarea
        ref={textareaRef}
        className={`${styles.editor} ${styles[`font-${currentFont}`]}`}
        value={content}
        onChange={handleContentChange}
        onKeyDown={handleKeyDown}
        onSelect={handleSelect}
        onWheel={handleWheel}
        style={{
          fontSize: `${currentFont === 'serif' ? Math.round(parseInt(fontSize) * 1.1) : fontSize}px`
        }}
        spellCheck={false}
        autoFocus
        placeholder={currentPlaceholder}
      />

      <div className={styles.bottomNav}>
        <div className={styles.leftControls}>
          <div className={styles.sizeWrapper}>
            <button className={styles.sizeButton}>{fontSize}px</button>
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
          <div className={styles.fontDropdown}>
            <button className={styles.fontButton}>
              Fonts
            </button>
            <div className={styles.fontMenu}>
              <div className={styles.fontCategory}>
                {FONT_CATEGORIES.basic.map(font => (
                  <button
                    key={font}
                    className={`${styles.fontOption} ${styles[`font-${font}`]} ${currentFont === font ? styles.active : ''}`}
                    onClick={() => setCurrentFont(font)}
                  >
                    {FONT_LABELS[font]}
                  </button>
                ))}
              </div>
              <div className={styles.fontDivider} />
              <div className={styles.fontCategory}>
                {FONT_CATEGORIES.calligraphy.map(font => (
                  <button
                    key={font}
                    className={`${styles.fontOption} ${styles[`font-${font}`]} ${currentFont === font ? styles.active : ''}`}
                    onClick={() => setCurrentFont(font)}
                  >
                    {FONT_LABELS[font]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <span className={styles.navDot}>•</span>
          <button
            className={`${styles.fontOption} ${currentFont === 'random' ? styles.active : ''}`}
            onClick={randomizeFont}
          >
            Random
          </button>
          <span className={styles.navDot}>•</span>
        </div>

        <div className={styles.rightControls}>
          <div className={styles.timerWrapper}>
            <Timer 
              onStart={startTimer}
              onPause={pauseTimer}
              onResume={resumeTimer}
              onReset={resetTimer}
              timeLeft={timeLeft}
              isRunning={isTimerActive}
            />
          </div>
          <span className={styles.navDot}>•</span>
          <button
            className={`${styles.historyToggle} ${isHistoryOpen ? styles.active : ''}`}
            onClick={handleHistoryToggle}
          >
            History
          </button>
          <span className={styles.navDot}>•</span>
          <button
            className={styles.themeToggle}
            onClick={toggleTheme}
          >
            {isDarkTheme ? 'Dark' : 'Light'}
          </button>
          <span className={styles.navDot}>•</span>
          <button
            className={`${styles.saveButton} ${hasUnsavedChanges ? styles.hasChanges : ''}`}
            onClick={handleSave}
            title="Save to history (Ctrl + S)"
          >
            Save
          </button>
        </div>
      </div>

      {isHistoryOpen && (
        <HistoryPanel
          entries={entries}
          onSelect={(entry) => {
            if (hasUnsavedChanges) {
              const shouldSwitch = window.confirm(
                'You have unsaved changes. Do you want to switch to another entry?'
              );
              if (!shouldSwitch) return;
            }
            setCurrentEntry(entry);
            setContent(entry.content);
            setCurrentFont(entry.font);
            setFontSize(entry.fontSize);
            setHasUnsavedChanges(false);
          }}
          onDelete={(id) => {
            const newEntries = entries.filter(e => e.id !== id);
            setEntries(newEntries);
            localStorage.setItem(ENTRIES_KEY, JSON.stringify(newEntries));
          }}
          onClearAll={() => {
            setEntries([]);
            localStorage.setItem(ENTRIES_KEY, '[]');
          }}
          isDarkTheme={isDarkTheme}
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          currentEntry={currentEntry}
          onNewEntry={createNewEntry}
        />
      )}
    </div>
  );
};

export default FullscreenEditor;