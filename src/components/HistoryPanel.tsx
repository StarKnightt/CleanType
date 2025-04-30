import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import styles from './HistoryPanel.module.css';
import { Entry } from '../types';
import { FiTrash2, FiEdit2, FiX } from 'react-icons/fi';
import { MdDeleteSweep } from 'react-icons/md';

interface HistoryPanelProps {
  entries: Entry[];
  onSelect: (entry: Entry) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  isDarkTheme: boolean;
  isOpen: boolean;
  onClose: () => void;
  currentEntry: Entry | null;
  onNewEntry: () => void;
}

// Function to get preview text (first few words or characters)
const getPreviewText = (text: string) => {
  return text.length > 100 ? text.substring(0, 100) + "..." : text;
};

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  entries,
  onSelect,
  onDelete,
  onClearAll,
  isDarkTheme,
  isOpen,
  onClose,
  currentEntry,
  onNewEntry
}) => {
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingId]);

  if (!isOpen) return null;

  const filteredEntries = entries.filter((entry) =>
    entry.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTitleClick = (entry: Entry, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingId(entry.id);
    setEditedTitle(entry.title);
  };

  const handleTitleSave = async (entry: Entry) => {
    try {
      setIsLoading(true);
      const updatedEntries = entries.map(e => 
        e.id === entry.id ? { ...e, title: editedTitle } : e
      );
      localStorage.setItem('cleantype-entries', JSON.stringify(updatedEntries));
      onSelect({ ...entry, title: editedTitle });
      setIsEditingId(null);
      toast.success('Entry renamed successfully');
    } catch (error) {
      console.error('Failed to rename entry:', error);
      toast.error('Failed to rename entry');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, entry: Entry) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave(entry);
    } else if (e.key === 'Escape') {
      setIsEditingId(null);
    }
  };

  return (
    <div className={`${styles.panel} ${isDarkTheme ? styles.darkTheme : styles.lightTheme} ${isOpen ? styles.open : ''}`}>
      <div className={styles.header}>
        <h2>History</h2>
        <div className={styles.headerButtons}>
          <button className={styles.newButton} onClick={onNewEntry}>
            New Entry
          </button>
          <button className={styles.closeButton} onClick={onClose}>
            <FiX />
          </button>
        </div>
      </div>

      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search entries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.entriesList}>
        {isLoading ? (
          <div className={styles.loadingContainer}>Loading...</div>
        ) : filteredEntries.length === 0 ? (
          <div className={styles.emptyState}>
            {searchQuery ? 'No entries found' : 'No entries yet'}
          </div>
        ) : (
          filteredEntries.map(entry => (
            <div
              key={entry.id}
              className={`${styles.entryItem} ${currentEntry?.id === entry.id ? styles.active : ''}`}
            >
              <div className={styles.entryContent} onClick={() => onSelect(entry)}>
                <div className={styles.entryHeader}>
                  <div className={styles.titleWrapper}>
                    {isEditingId === entry.id ? (
                      <input
                        ref={inputRef}
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        onBlur={() => handleTitleSave(entry)}
                        onKeyDown={(e) => handleKeyDown(e, entry)}
                        className={styles.titleInput}
                      />
                    ) : (
                      <>
                        <span
                          className={styles.entryTitle}
                          onClick={(e) => handleTitleClick(entry, e)}
                        >
                          {entry.title || 'Untitled'}
                        </span>
                        <button
                          className={styles.editButton}
                          onClick={(e) => handleTitleClick(entry, e)}
                        >
                          <FiEdit2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                  <span className={styles.entryDate}>
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className={styles.entryPreview}>{getPreviewText(entry.content)}</p>
                <div className={styles.entryFooter}>
                  <span className={styles.wordCount}>
                    {entry.content.trim().split(/\s+/).length} words
                  </span>
                  <button
                    className={styles.deleteButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEntryToDelete(entry.id);
                    }}
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.footer}>
        <button
          className={styles.clearAllButton}
          onClick={() => setShowClearConfirm(true)}
        >
          <MdDeleteSweep size={18} />
          Clear All
        </button>
      </div>

      {entryToDelete && (
        <div className={styles.confirmDialog}>
          <div className={styles.confirmContent}>
            <h3>Delete Entry</h3>
            <p>Are you sure you want to delete this entry? This action cannot be undone.</p>
            <div className={styles.confirmActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setEntryToDelete(null)}
              >
                Cancel
              </button>
              <button
                className={styles.confirmButton}
                onClick={() => {
                  onDelete(entryToDelete);
                  setEntryToDelete(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className={styles.confirmDialog}>
          <div className={styles.confirmContent}>
            <h3>Clear All Entries</h3>
            <p>Are you sure you want to delete all entries? This action cannot be undone.</p>
            <div className={styles.confirmActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
              <button
                className={styles.confirmButton}
                onClick={() => {
                  onClearAll();
                  setShowClearConfirm(false);
                }}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 