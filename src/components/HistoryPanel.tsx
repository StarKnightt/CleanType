import React, { useState } from 'react';
import styles from './HistoryPanel.module.css';
import { toast } from 'react-hot-toast';

interface Entry {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  font: 'lato' | 'arial' | 'system' | 'serif' | 'random';
  fontSize: string;
  theme: 'dark' | 'light';
}

interface HistoryPanelProps {
  isOpen: boolean;
  entries: Entry[];
  currentEntry: Entry | null;
  onClose: () => void;
  onSelectEntry: (entry: Entry) => void;
  onDeleteEntry: (entry: Entry) => void;
  onClearAll: () => void;
  isDarkTheme: boolean;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  isOpen,
  entries,
  currentEntry,
  onClose,
  onSelectEntry,
  onDeleteEntry,
  onClearAll,
  isDarkTheme
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  
  const filteredEntries = entries.filter(entry => 
    entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartRename = (entry: Entry) => {
    setEditingId(entry.id);
    setEditingTitle(entry.title);
  };

  const handleSaveRename = (entry: Entry) => {
    const updatedEntry = { ...entry, title: editingTitle };
    const entryIndex = entries.findIndex(e => e.id === entry.id);
    if (entryIndex !== -1) {
      const newEntries = [...entries];
      newEntries[entryIndex] = updatedEntry;
      localStorage.setItem('freewrite-entries', JSON.stringify(newEntries));
      
      // Update current entry if it's being renamed
      if (currentEntry?.id === entry.id) {
        onSelectEntry(updatedEntry);
      }
      
      toast.success('Entry renamed');
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, entry: Entry) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRename(entry);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`${styles.panel} ${isDarkTheme ? styles.dark : styles.light}`}>
      <div className={styles.header}>
        <h2>History</h2>
        <button onClick={onClose} className={styles.closeButton}>×</button>
      </div>
      
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search entries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.entriesList}>
        {filteredEntries.length === 0 ? (
          <div className={styles.emptyState}>
            {searchTerm ? 'No matching entries found' : 'No entries yet'}
          </div>
        ) : (
          filteredEntries.map(entry => (
            <div
              key={entry.id}
              className={`${styles.entryItem} ${currentEntry?.id === entry.id ? styles.active : ''}`}
              onClick={() => onSelectEntry(entry)}
            >
              <div className={styles.entryHeader}>
                {editingId === entry.id ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => handleSaveRename(entry)}
                    onKeyDown={(e) => handleKeyDown(e, entry)}
                    className={styles.titleInput}
                    autoFocus
                  />
                ) : (
                  <div 
                    className={styles.entryTitle}
                    onDoubleClick={() => handleStartRename(entry)}
                  >
                    {entry.title}
                  </div>
                )}
                <div className={styles.entryDate}>
                  {new Date(entry.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className={styles.entryPreview}>
                {entry.content.slice(0, 100)}...
              </div>
              <button
                className={styles.deleteButton}
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Are you sure you want to delete this entry?')) {
                    onDeleteEntry(entry);
                  }
                }}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      {entries.length > 0 && (
        <div className={styles.footer}>
          <button
            className={styles.clearAllButton}
            onClick={onClearAll}
          >
            Clear All History
          </button>
        </div>
      )}
    </div>
  );
}; 