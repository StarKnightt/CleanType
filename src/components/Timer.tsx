import React from 'react';
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
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.timerContainer}>
      {!isRunning ? (
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
        </div>
      ) : (
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
      )}
    </div>
  );
}; 