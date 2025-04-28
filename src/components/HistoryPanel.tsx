import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import styles from './HistoryPanel.module.css';
import { Entry } from '../types';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
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

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedEntryId(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedEntryId) {
      onDelete(selectedEntryId);
      setShowDeleteConfirm(false);
      setSelectedEntryId(null);
    }
  };

  const handleClearAllClick = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClear = async () => {
    onClearAll();
    setShowClearConfirm(false);
  };

  return (
    <div className={`${styles.panel} ${isDarkTheme ? '' : styles.lightTheme}`}>
      <div className={styles.header}>
        <h2>History</h2>
        <div className={styles.headerButtons}>
          <button
            className={styles.newButton}
            onClick={onNewEntry}
            title="New entry"
          >
            +
          </button>
          <button
            className={styles.closeButton}
            onClick={onClose}
            title="Close history"
          >
            ×
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
              onClick={() => onSelect(entry)}
            >
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
                        {entry.title}
                      </span>
                      <button
                        className={styles.editButton}
                        onClick={(e) => handleTitleClick(entry, e)}
                        title="Edit title"
                      >
                        ✎
                      </button>
                    </>
                  )}
                </div>
                <button
                  className={styles.deleteButton}
                  onClick={(e) => handleDeleteClick(e, entry.id)}
                  title="Delete entry"
                >
                  ×
                </button>
              </div>
              <div className={styles.entryPreview}>
                {getPreviewText(entry.content)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.footer}>
        <button
          className={styles.clearAllButton}
          onClick={handleClearAllClick}
          disabled={entries.length === 0}
        >
          Clear All
        </button>
      </div>

      {showDeleteConfirm && (
        <div className={styles.confirmDialog}>
          <h3>Delete Entry</h3>
          <p>Are you sure you want to delete this entry?</p>
          <div className={styles.confirmActions}>
            <button onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
            <button onClick={handleConfirmDelete}>Delete</button>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className={styles.confirmDialog}>
          <h3>Clear All Entries</h3>
          <p>Are you sure you want to delete all entries? This cannot be undone.</p>
          <div className={styles.confirmActions}>
            <button onClick={() => setShowClearConfirm(false)}>Cancel</button>
            <button onClick={handleConfirmClear}>Clear All</button>
          </div>
        </div>
      )}
    </div>
  );
}; 