import React, { useState, useEffect, useRef } from 'react';
import styles from './FullscreenEditor.module.css';
import { HistoryPanel } from './HistoryPanel';
import Timer from './Timer';
import { toast, Toaster } from 'react-hot-toast';

const STORAGE_KEY = 'freewrite-content';
const FONT_STORAGE_KEY = 'freewrite-font';
const SIZE_STORAGE_KEY = 'freewrite-size';
const ENTRIES_KEY = 'freewrite-entries';
const THEME_KEY = 'freewrite-theme';

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

type FontStyle = 'lato' | 'arial' | 'system' | 'serif' | 'random';
type Theme = 'dark' | 'light';

const FONT_LABELS: Record<FontStyle, string> = {
  lato: 'Lato',
  arial: 'Monospace',
  system: 'Sans',
  serif: 'Serif',
  random: 'Default'
};

const SIZE_PRESETS = ['20', '24', '28', '32', '36'];

export const FullscreenEditor: React.FC = () => {
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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>(() => {
    return JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]');
  });

  const [currentFont, setCurrentFont] = useState<FontStyle>(() => {
    return (localStorage.getItem(FONT_STORAGE_KEY) as FontStyle) || 'system';
  });

  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem(SIZE_STORAGE_KEY) || '28';
  });

  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => {
    return localStorage.getItem(THEME_KEY) !== 'light';
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [wordCount, setWordCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isTimerDialogOpen, setIsTimerDialogOpen] = useState(false);

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

  const saveCurrentEntry = async () => {
    if (currentEntry && content.trim()) {
      const updatedEntry = {
        ...currentEntry,
        content,
        updatedAt: new Date().toISOString(),
        font: currentFont,
        fontSize: fontSize,
        theme: isDarkTheme ? 'dark' : 'light'
      };
      
      const newEntries = [...entries];
      const index = newEntries.findIndex(e => e.id === currentEntry.id);
      if (index >= 0) {
        newEntries[index] = {
          ...updatedEntry,
          theme: updatedEntry.theme as Theme
        };
      } else {
        newEntries.push({
          ...updatedEntry,
          theme: updatedEntry.theme as Theme
        });
      }
      setEntries(newEntries);
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(newEntries));
      localStorage.setItem(STORAGE_KEY, content);
      setHasUnsavedChanges(false);
    }
  };

  // Auto-save content and entries
  useEffect(() => {
    const saveContent = () => {
      if (currentEntry) {
        localStorage.setItem(STORAGE_KEY, content);
        saveCurrentEntry();
      }
    };
    const timeoutId = setTimeout(saveContent, 300);
    return () => clearTimeout(timeoutId);
  }, [content, currentEntry]);

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

  const handleWheel = (e: React.WheelEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -1 : 1;
      const newSize = Math.min(Math.max(parseInt(fontSize) + delta, 8), 72);
      setFontSize(newSize.toString());
    }
  };

  const handleSelectEntry = (entry: Entry) => {
    if (hasUnsavedChanges) {
      const shouldSwitch = window.confirm(
        'You have unsaved changes. Would you like to save before switching entries?'
      );
      
      if (shouldSwitch) {
        saveCurrentEntry().then(() => {
          setCurrentEntry(entry);
          setContent(entry.content);
          setCurrentFont(entry.font);
          setFontSize(entry.fontSize);
          setIsDarkTheme(entry.theme === 'dark');
          setHasUnsavedChanges(false);
        });
      } else {
        setCurrentEntry(entry);
        setContent(entry.content);
        setCurrentFont(entry.font);
        setFontSize(entry.fontSize);
        setIsDarkTheme(entry.theme === 'dark');
        setHasUnsavedChanges(false);
      }
    } else {
      setCurrentEntry(entry);
      setContent(entry.content);
      setCurrentFont(entry.font);
      setFontSize(entry.fontSize);
      setIsDarkTheme(entry.theme === 'dark');
      setHasUnsavedChanges(false);
    }
  };

  const handleDeleteEntry = (entryToDelete: Entry) => {
    const newEntries = entries.filter(e => e.id !== entryToDelete.id);
    setEntries(newEntries);
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(newEntries));
    toast.success('Entry deleted successfully');

    // Only create a new entry if we're deleting the current one
    if (currentEntry?.id === entryToDelete.id) {
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
      
      // Add the new entry to the list
      const updatedEntries = [...newEntries, newEntry];
      setEntries(updatedEntries);
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(updatedEntries));
    }
  };

  const clearAllHistory = () => {
    if (window.confirm('Are you sure you want to clear all history? This cannot be undone.')) {
      setEntries([]);
      localStorage.setItem(ENTRIES_KEY, '[]');
      
      // Create a new entry if we cleared the current one
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
      
      const updatedEntries = [newEntry];
      setEntries(updatedEntries);
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(updatedEntries));
      
      toast.success('All entries cleared');
    }
  };

  const toggleTheme = () => {
    setIsDarkTheme(prev => {
      const newTheme = !prev;
      localStorage.setItem(THEME_KEY, newTheme ? 'dark' : 'light');
      return newTheme;
    });
  };

  const createNewEntry = () => {
    const createEntry = () => {
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
      
      // Save the new entry immediately
      const newEntries = [...entries, newEntry];
      setEntries(newEntries);
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(newEntries));
      
      toast.success('New entry created');
    };

    if (hasUnsavedChanges && content.trim()) {
      const shouldSave = window.confirm(
        'You have unsaved changes. Would you like to save before creating a new entry?'
      );
      
      if (shouldSave) {
        saveCurrentEntry().then(createEntry);
      } else {
        createEntry();
      }
    } else {
      createEntry();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // New Document (Ctrl + N)
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();
      createNewEntry();
      return;
    }

    // Save (Ctrl + S)
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      // Will be handled by auto-save
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

    // Escape to clear selection
    if (e.key === 'Escape') {
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleSelect = () => {
    // No need to track selection since we're not using it
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
        setTimeLeft(time => time - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeLeft]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = (minutes: number) => {
    setTimeLeft(minutes * 60);
    setIsTimerActive(true);
    setIsTimerDialogOpen(false);
  };

  return (
    <div className={`${styles.container} ${isDarkTheme ? styles.darkTheme : styles.lightTheme}`}>
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
        <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
                setContent(e.target.value);
                setHasUnsavedChanges(true);
            }}
            onKeyDown={handleKeyDown}
            onSelect={handleSelect}
            onWheel={handleWheel}
            className={`${styles.editor} ${styles[`font-${currentFont}`]}`}
            style={{ fontSize: `${fontSize}px` }}
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
          <button 
            className={styles.navButton}
            onClick={createNewEntry}
            title="New entry"
          >
            New
          </button>
          <span className={styles.navDot}>•</span>
          <button 
            className={styles.navButton}
            onClick={() => setIsTimerDialogOpen(true)}
            title="Set timer"
          >
            {isTimerActive ? formatTime(timeLeft) : 'Timer'}
          </button>
          <span className={styles.navDot}>•</span>
          <button 
            className={styles.navButton}
            onClick={toggleTheme}
          >
            {isDarkTheme ? 'Light' : 'Dark'}
          </button>
          <span className={styles.navDot}>•</span>
          <button
            className={styles.navButton}
            onClick={() => setIsHistoryOpen(true)}
            title="View history"
          >
            History
          </button>
        </div>
      </div>

      <HistoryPanel
        isOpen={isHistoryOpen}
        entries={entries}
        currentEntry={currentEntry}
        onClose={() => setIsHistoryOpen(false)}
        onSelectEntry={handleSelectEntry}
        onDeleteEntry={handleDeleteEntry}
        onClearAll={clearAllHistory}
        isDarkTheme={isDarkTheme}
      />

      <Timer
        isOpen={isTimerDialogOpen}
        onClose={() => {
          setIsTimerDialogOpen(false);
          setIsTimerActive(false);
        }}
        onStart={startTimer}
        isDarkTheme={isDarkTheme}
      />
    </div>
  );
};

export default FullscreenEditor;