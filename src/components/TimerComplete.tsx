import React, { useEffect } from 'react';
import styles from './TimerComplete.module.css';

interface TimerCompleteProps {
  onClose: () => void;
  isDarkTheme: boolean;
}

export const TimerComplete: React.FC<TimerCompleteProps> = ({ onClose, isDarkTheme }) => {
  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className={styles.overlay} 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="timer-complete-title"
    >
      <div 
        className={`${styles.notification} ${isDarkTheme ? '' : styles.lightTheme}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.content}>
          <div className={styles.icon} role="img" aria-label="Timer complete">⏰</div>
          <h2 id="timer-complete-title">Time's Up!</h2>
          <p>Your timer has completed.</p>
          <p className={styles.subtext}>Take a moment to stretch and reflect.</p>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close notification"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}; 