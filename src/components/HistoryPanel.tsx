import React, { useState } from 'react';
import styles from './HistoryPanel.module.css';
import { Entry } from '../types';
import toast from 'react-hot-toast';

interface HistoryPanelProps {
  entries: Entry[];
  onSelect: (entry: Entry) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  isDarkTheme: boolean;
  isOpen: boolean;
  onClose: () => void;
  currentEntry: Entry | null;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  entries,
  onSelect,
  onDelete,
  onClearAll,
  isDarkTheme,
  isOpen,
  onClose,
  currentEntry
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  if (!isOpen) return null;

  const filteredEntries = entries
    .filter(entry => entry.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const handleTitleClick = (entry: Entry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(entry.id);
    setEditingTitle(entry.title);
  };

  const handleTitleSave = (entry: Entry) => {
    const entries = JSON.parse(localStorage.getItem('entries') || '[]');
    const updatedEntries = entries.map((e: Entry) =>
      e.id === entry.id ? { ...e, title: editingTitle } : e
    );
    localStorage.setItem('entries', JSON.stringify(updatedEntries));
    setEditingId(null);
    toast.success('Entry renamed successfully');
  };

  const handleKeyDown = (e: React.KeyboardEvent, entry: Entry) => {
    if (e.key === 'Enter') {
      handleTitleSave(entry);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  return (
    <div className={`${styles.panel} ${isDarkTheme ? styles.darkTheme : styles.lightTheme}`}>
      <div className={styles.header}>
        <h2>History</h2>
        <button className={styles.closeButton} onClick={onClose}>×</button>
      </div>
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search entries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <button onClick={onClearAll} className={styles.clearAllButton}>
          Clear All History
        </button>
      </div>
      <div className={styles.entriesList}>
        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className={`${styles.entryItem} ${currentEntry?.id === entry.id ? styles.active : ''}`}
            onClick={() => onSelect(entry)}
          >
            {editingId === entry.id ? (
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => handleTitleSave(entry)}
                onKeyDown={(e) => handleKeyDown(e, entry)}
                className={styles.titleInput}
                autoFocus
              />
            ) : (
              <span
                className={styles.entryTitle}
                onClick={(e) => handleTitleClick(entry, e)}
              >
                {entry.title}
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(entry.id);
              }}
              className={styles.deleteButton}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}; 