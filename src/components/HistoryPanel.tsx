import React from 'react';
import styles from './HistoryPanel.module.css';

interface Entry {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  title: string;
}

interface HistoryPanelProps {
  isOpen: boolean;
  entries: Entry[];
  currentEntry: Entry | null;
  onClose: () => void;
  onSelectEntry: (entry: Entry) => void;
  onDeleteEntry: (entry: Entry) => void;
  isDarkTheme?: boolean;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  isOpen,
  entries,
  currentEntry,
  onClose,
  onSelectEntry,
  onDeleteEntry,
  isDarkTheme = true
}) => {
  const handleDelete = (entry: Entry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this entry?')) {
      onDeleteEntry(entry);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPreview = (content: string) => {
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
  };

  if (!isOpen) return null;

  return (
    <div className={`${styles.panel} ${isDarkTheme ? styles.darkTheme : styles.lightTheme}`}>
      <div className={styles.header}>
        <h2>History</h2>
        <button className={styles.closeButton} onClick={onClose}>×</button>
      </div>
      <div className={styles.entriesList}>
        {entries.length === 0 ? (
          <div className={styles.emptyState}>No entries yet</div>
        ) : (
          entries.map(entry => (
            <div
              key={entry.id}
              className={`${styles.entryItem} ${currentEntry?.id === entry.id ? styles.active : ''}`}
              onClick={() => onSelectEntry(entry)}
            >
              <div className={styles.entryHeader}>
                <div className={styles.entryDate}>{formatDate(entry.updatedAt)}</div>
                <button
                  className={styles.deleteButton}
                  onClick={(e) => handleDelete(entry, e)}
                >
                  ×
                </button>
              </div>
              <div className={styles.entryPreview}>
                {getPreview(entry.content)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryPanel; 