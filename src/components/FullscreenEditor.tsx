import React, { useEffect, useRef, useState } from 'react';
import styles from './FullscreenEditor.module.css';
import { toast, Toaster } from 'react-hot-toast';
import { appWindow } from '@tauri-apps/api/window';
import { Timer } from './Timer';
import { HistoryPanel } from './HistoryPanel';
import type { Entry, FontStyle, Theme } from '../types';
import { useEntries } from '../hooks/useEntries';
import { useUndoRedo } from '../hooks/useUndoRedo';
import {
  exportEntries,
  importEntries,
  openTextFile,
  readTextFileAtPath,
  isTextFilePath,
  isTauri,
  type OpenedFile,
} from '../lib/storage';

interface FullscreenEditorProps {
  isDarkTheme: boolean;
  onThemeToggle: () => void;
}

const FONT_STORAGE_KEY = 'freewrite-font';
const SIZE_STORAGE_KEY = 'freewrite-size';

const FONT_LABELS: Record<FontStyle, string> = {
  lato: 'Sans',
  arial: 'Mono',
  system: 'Inter',
  serif: 'Serif',
  script: 'Script',
  elegant: 'Elegant',
  classic: 'Classic',
  playpen: 'Playpen',
  random: 'Random',
};

const SIZE_PRESETS = ['16', '18', '20', '24', '28', '32', '36', '42', '48'];

const FONT_CATEGORIES = {
  basic: ['system', 'lato', 'arial', 'serif'] as FontStyle[],
  calligraphy: ['playpen', 'script', 'elegant', 'classic'] as FontStyle[],
};

const PLACEHOLDERS = [
  'Start writing your story...',
  "What's on your mind today?",
  'Share your thoughts and dreams...',
  'Write about your favorite memory...',
  'What are your goals for today?',
  "Describe a place you'd love to visit...",
  'Write a letter to your future self...',
];

export const FullscreenEditor: React.FC<FullscreenEditorProps> = ({ isDarkTheme, onThemeToggle }) => {
  const theme: Theme = isDarkTheme ? 'dark' : 'light';

  const {
    entries,
    currentEntry,
    loaded,
    createEntry,
    updateCurrent,
    selectEntry,
    deleteEntry,
    clearAll,
    renameEntry,
    promoteCurrent,
    replaceAll,
  } = useEntries();

  const { value: content, set: setContent, reset: resetContent, undo, redo } = useUndoRedo('');

  const [currentFont, setCurrentFont] = useState<FontStyle>(
    () => (localStorage.getItem(FONT_STORAGE_KEY) as FontStyle) || 'system',
  );
  const [fontSize, setFontSize] = useState(() => localStorage.getItem(SIZE_STORAGE_KEY) || '28');

  const [wordCount, setWordCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(PLACEHOLDERS[0]);
  const [isDragging, setIsDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const loadedEntryId = useRef<string | null>(null);
  const handleDropRef = useRef<(paths: string[]) => void>(() => {});

  // Load editor text only when a *different* entry becomes active — not on
  // every auto-save — so undo history survives while typing. The content guard
  // avoids clobbering the editor when the switch was triggered by auto-creating
  // an entry from what the user just typed.
  useEffect(() => {
    const id = currentEntry?.id ?? null;
    if (id !== loadedEntryId.current) {
      loadedEntryId.current = id;
      const next = currentEntry?.content ?? '';
      if (next !== content) resetContent(next);
    }
  }, [currentEntry, content, resetContent]);

  useEffect(() => {
    const trimmed = content.trim();
    setWordCount(trimmed ? trimmed.split(/\s+/).length : 0);
  }, [content]);

  useEffect(() => {
    localStorage.setItem(FONT_STORAGE_KEY, currentFont);
  }, [currentFont]);

  useEffect(() => {
    localStorage.setItem(SIZE_STORAGE_KEY, fontSize);
  }, [fontSize]);

  // Single auto-save: sync editor state into the active entry, creating one on
  // first input if none exists.
  useEffect(() => {
    if (!loaded) return;
    const timeout = setTimeout(() => {
      if (currentEntry) {
        if (
          currentEntry.content !== content ||
          currentEntry.font !== currentFont ||
          currentEntry.fontSize !== fontSize ||
          currentEntry.theme !== theme
        ) {
          updateCurrent({ content, font: currentFont, fontSize, theme });
        }
      } else if (content.trim()) {
        createEntry({ font: currentFont, fontSize, theme }, content);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [content, currentFont, fontSize, theme, currentEntry, loaded, updateCurrent, createEntry]);

  // Rotating placeholder text.
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % PLACEHOLDERS.length;
      setCurrentPlaceholder(PLACEHOLDERS[index]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer.
  useEffect(() => {
    if (!isTimerActive || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((time) => {
        if (time <= 1) {
          setIsTimerActive(false);
          toast.success('Timer completed!');
          return 0;
        }
        return time - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerActive, timeLeft]);

  const isDirty = currentEntry ? content !== currentEntry.content : content.trim().length > 0;

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const handleWheel = (e: React.WheelEvent<HTMLTextAreaElement>) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -2 : 2;
    const newSize = Math.min(Math.max(parseInt(fontSize) + delta, 12), 72);
    setFontSize(newSize.toString());
    toast.success(`Font size: ${newSize}px`, { duration: 1000 });
  };

  const handleNewEntry = () => {
    createEntry({ font: currentFont, fontSize, theme });
    toast.success('New entry created');
  };

  const handleSave = () => {
    if (!content.trim()) return;
    if (currentEntry) {
      updateCurrent({ content, font: currentFont, fontSize, theme });
      promoteCurrent();
    } else {
      createEntry({ font: currentFont, fontSize, theme }, content);
    }
    toast.success('Saved to history');
  };

  const toggleFullscreen = async () => {
    try {
      const isFullscreen = await appWindow.isFullscreen();
      await appWindow.setFullscreen(!isFullscreen);
      toast.success(isFullscreen ? 'Exited fullscreen' : 'Entered fullscreen');
    } catch (error) {
      console.error('Failed to toggle fullscreen:', error);
      toast.error('Failed to toggle fullscreen mode');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.metaKey || e.ctrlKey;

    if (mod && e.key === 's') {
      e.preventDefault();
      handleSave();
    } else if (mod && e.key === 'n') {
      e.preventDefault();
      handleNewEntry();
    } else if (mod && e.key === 'o') {
      e.preventDefault();
      void handleOpenFile();
    } else if (mod && !e.shiftKey && e.key === 'z') {
      e.preventDefault();
      undo();
    } else if (mod && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
      e.preventDefault();
      redo();
    } else if (e.key === 'F11') {
      e.preventDefault();
      void toggleFullscreen();
    }
  };

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

  const randomizeFont = () => {
    const fonts = [...FONT_CATEGORIES.basic, ...FONT_CATEGORIES.calligraphy];
    let next = currentFont;
    while (next === currentFont) {
      next = fonts[Math.floor(Math.random() * fonts.length)];
    }
    setCurrentFont(next);
  };

  const handleSelectEntry = (entry: Entry) => {
    // Flush pending edits to the outgoing entry before switching.
    if (currentEntry && content !== currentEntry.content) {
      updateCurrent({ content, font: currentFont, fontSize, theme });
    }
    selectEntry(entry);
  };

  const handleExport = async () => {
    if (entries.length === 0) {
      toast.error('No entries to export');
      return;
    }
    try {
      const path = await exportEntries(entries);
      if (path) toast.success('Entries exported');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed');
    }
  };

  const handleImport = async () => {
    try {
      const imported = await importEntries();
      if (!imported) return;
      replaceAll(imported);
      toast.success(`Imported ${imported.length} entries`);
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Import failed');
    }
  };

  // Load an external text file as a brand-new entry, flushing any pending edits
  // to the current entry first so nothing is lost.
  const openFileAsEntry = (file: OpenedFile) => {
    if (currentEntry && content !== currentEntry.content) {
      updateCurrent({ content, font: currentFont, fontSize, theme });
    }
    const entry = createEntry({ font: currentFont, fontSize, theme }, file.content);
    if (file.title) renameEntry(entry.id, file.title);
  };

  const handleOpenFile = async () => {
    try {
      const file = await openTextFile();
      if (!file) return;
      openFileAsEntry(file);
      toast.success(`Opened ${file.title}`);
    } catch (error) {
      console.error('Open failed:', error);
      toast.error('Could not open that file');
    }
  };

  // Always point the (mount-time) drag-drop listener at a closure with fresh
  // state, so we register the native listener only once.
  handleDropRef.current = async (paths: string[]) => {
    const target = paths.find(isTextFilePath) ?? paths[0];
    if (!target) return;
    try {
      const file = await readTextFileAtPath(target);
      openFileAsEntry(file);
      toast.success(`Opened ${file.title}`);
    } catch (error) {
      console.error('Drop open failed:', error);
      toast.error('Could not open that file');
    }
  };

  // Native (Tauri) file drag-and-drop. Registered once; reads the dropped path
  // through the Rust command so it works outside the sandboxed FS scope.
  useEffect(() => {
    if (!isTauri()) return;
    let active = true;
    let unlisten: (() => void) | undefined;
    appWindow
      .onFileDropEvent((event) => {
        if (event.payload.type === 'hover') setIsDragging(true);
        else if (event.payload.type === 'drop') {
          setIsDragging(false);
          handleDropRef.current(event.payload.paths);
        } else setIsDragging(false);
      })
      .then((fn) => {
        if (active) unlisten = fn;
        else fn();
      });
    return () => {
      active = false;
      unlisten?.();
    };
  }, []);

  return (
    <div className={`${styles.editorContainer} ${isDarkTheme ? styles.darkTheme : styles.lightTheme}`}>
      <Toaster
        position="bottom-center"
        gutter={8}
        toastOptions={{
          duration: 2000,
          style: {
            background: isDarkTheme ? 'rgba(28, 28, 30, 0.7)' : 'rgba(255, 255, 255, 0.82)',
            color: isDarkTheme ? 'rgba(255, 255, 255, 0.92)' : 'rgba(0, 0, 0, 0.85)',
            border: `1px solid ${isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'}`,
            backdropFilter: 'saturate(180%) blur(20px)',
            WebkitBackdropFilter: 'saturate(180%) blur(20px)',
            boxShadow: isDarkTheme
              ? '0 10px 34px rgba(0, 0, 0, 0.55), 0 1px 1px rgba(0, 0, 0, 0.4)'
              : '0 10px 30px rgba(0, 0, 0, 0.12), 0 1px 1px rgba(0, 0, 0, 0.04)',
            borderRadius: '12px',
            padding: '9px 14px',
            fontSize: '13px',
            fontWeight: 500,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
            letterSpacing: '-0.01em',
          },
          success: {
            iconTheme: {
              primary: isDarkTheme ? '#0a84ff' : '#007aff',
              secondary: isDarkTheme ? '#1c1c1e' : '#ffffff',
            },
          },
          error: {
            iconTheme: { primary: '#ff3b30', secondary: isDarkTheme ? '#1c1c1e' : '#ffffff' },
          },
        }}
      />
      {isDragging && (
        <div className={styles.dropOverlay}>
          <div className={styles.dropCard}>
            <svg
              className={styles.dropIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 3v4a1 1 0 0 0 1 1h4" />
              <path d="M5 21V5a2 2 0 0 1 2-2h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
              <path d="M12 11v6" />
              <path d="m9 14 3-3 3 3" />
            </svg>
            <p className={styles.dropTitle}>Drop to open</p>
            <p className={styles.dropHint}>.txt, .md, or plain text</p>
          </div>
        </div>
      )}
      <div className={styles.wordCount}>
        {wordCount} {wordCount === 1 ? 'word' : 'words'}
      </div>
      <button className={styles.newEntryButton} onClick={handleNewEntry} title="Create new entry">
        +
      </button>
      <textarea
        ref={textareaRef}
        className={`${styles.editor} ${styles[`font-${currentFont}`]}`}
        value={content}
        onChange={handleContentChange}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        style={{
          fontSize: `${currentFont === 'serif' ? Math.round(parseInt(fontSize) * 1.1) : fontSize}px`,
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
              {SIZE_PRESETS.map((size) => (
                <button key={size} className={styles.sizePreset} onClick={() => setFontSize(size)}>
                  {size}px
                </button>
              ))}
            </div>
          </div>
          <span className={styles.navDot}>•</span>
          <div className={styles.fontDropdown}>
            <button className={styles.fontButton}>Fonts</button>
            <div className={styles.fontMenu}>
              <div className={styles.fontCategory}>
                {FONT_CATEGORIES.basic.map((font) => (
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
                {FONT_CATEGORIES.calligraphy.map((font) => (
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
            onClick={() => setIsHistoryOpen((prev) => !prev)}
          >
            History
          </button>
          <span className={styles.navDot}>•</span>
          <button className={styles.themeToggle} onClick={onThemeToggle}>
            {isDarkTheme ? 'Dark' : 'Light'}
          </button>
          <span className={styles.navDot}>•</span>
          <button
            className={`${styles.saveButton} ${isDirty ? styles.hasChanges : ''}`}
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
          onSelect={handleSelectEntry}
          onDelete={deleteEntry}
          onClearAll={clearAll}
          onRename={renameEntry}
          onExport={handleExport}
          onImport={handleImport}
          onOpenFile={handleOpenFile}
          isDarkTheme={isDarkTheme}
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          currentEntry={currentEntry}
          onNewEntry={handleNewEntry}
        />
      )}
    </div>
  );
};

export default FullscreenEditor;
