import React, { useState } from 'react';
import styles from './Timer.module.css';

interface TimerProps {
  onStart: (minutes: number) => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  timeLeft: number;
  isRunning: boolean;
}

const TIMER_PRESETS = [5, 15, 25, 30];

export const Timer: React.FC<TimerProps> = ({ 
  onStart,
  onPause,
  onResume,
  onReset,
  timeLeft,
  isRunning
}) => {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const minutes = parseInt(customMinutes);
    if (!isNaN(minutes) && minutes > 0) {
      onStart(minutes);
      setShowCustomInput(false);
      setCustomMinutes('');
    }
  };

  // If there's no time left, show presets and custom input
  if (timeLeft === 0) {
    return (
      <div className={styles.timerContainer}>
        {showCustomInput ? (
          <div className={styles.overlay} onClick={() => setShowCustomInput(false)}>
            <div 
              className={styles.timerDialog}
              onClick={e => e.stopPropagation()}
            >
              <div className={styles.dialogHeader}>
                <h3>Set Custom Timer</h3>
                <button 
                  className={styles.closeButton}
                  onClick={() => setShowCustomInput(false)}
                  aria-label="Close dialog"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleCustomSubmit} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label htmlFor="minutes" className={styles.inputLabel}>Minutes:</label>
                  <input
                    id="minutes"
                    type="number"
                    min="1"
                    max="999"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    className={styles.timeInput}
                    placeholder="Enter minutes"
                    autoFocus
                  />
                </div>
                <div className={styles.dialogActions}>
                  <button 
                    type="button" 
                    onClick={() => setShowCustomInput(false)}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className={styles.startButton}
                    disabled={!customMinutes || parseInt(customMinutes) <= 0}
                  >
                    Start Timer
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className={styles.presetButtons}>
            {TIMER_PRESETS.map((minutes) => (
              <button
                key={minutes}
                onClick={() => onStart(minutes)}
                className={styles.presetButton}
              >
                {minutes}m
              </button>
            ))}
            <button
              onClick={() => setShowCustomInput(true)}
              className={`${styles.presetButton} ${styles.customButton}`}
            >
              Custom
            </button>
          </div>
        )}
      </div>
    );
  }

  // If timer is set (timeLeft > 0), show the active timer
  return (
    <div className={styles.timerContainer}>
      <div className={styles.activeTimer}>
        <span className={styles.time}>{formatTime(timeLeft)}</span>
        <div className={styles.controls}>
          {isRunning ? (
            <button onClick={onPause} className={styles.control}>⏸️</button>
          ) : (
            <button onClick={onResume} className={styles.control}>▶️</button>
          )}
          <button onClick={onReset} className={styles.control}>⏹️</button>
        </div>
      </div>
    </div>
  );
}; 