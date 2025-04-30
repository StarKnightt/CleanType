import React, { useState, useRef, useEffect } from 'react';
import { FiPause, FiPlay, FiStopCircle, FiClock } from 'react-icons/fi';
import styles from './Timer.module.css';

interface TimerProps {
  onStart: (minutes: number) => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  timeLeft: number;
  isRunning: boolean;
}

const TIMER_PRESETS = [15, 30, 45, 60];

export const Timer: React.FC<TimerProps> = ({ 
  onStart,
  onPause,
  onResume,
  onReset,
  timeLeft,
  isRunning
}) => {
  const [showPresets, setShowPresets] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside to close the preset menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPresets(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleTimerClick = (minutes?: number) => {
    if (minutes) {
      onStart(minutes);
      setShowPresets(false);
    } else if (timeLeft === 0) {
      setShowPresets(prev => !prev);
    }
  };

  return (
    <div 
      className={styles.timerContainer}
      ref={containerRef}
    >
      <div 
        className={styles.timerButton}
        onClick={() => handleTimerClick()}
      >
        {timeLeft === 0 ? (
          <div className={styles.timerDisplay}>
            <FiClock className={styles.clockIcon} />
            <span>15m</span>
          </div>
        ) : (
          <div className={styles.activeTimer}>
            <span className={styles.time}>{formatTime(timeLeft)}</span>
            <div className={styles.controls}>
              {isRunning ? (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onPause();
                  }} 
                  className={styles.control} 
                  aria-label="Pause Timer"
                >
                  <FiPause />
                </button>
              ) : (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onResume();
                  }} 
                  className={styles.control} 
                  aria-label="Resume Timer"
                >
                  <FiPlay />
                </button>
              )}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onReset();
                }} 
                className={styles.control} 
                aria-label="Reset Timer"
              >
                <FiStopCircle />
              </button>
            </div>
          </div>
        )}
      </div>
      {timeLeft === 0 && showPresets && (
        <div className={styles.presetButtons}>
          {TIMER_PRESETS.map((minutes) => (
            <button
              key={minutes}
              onClick={() => handleTimerClick(minutes)}
              className={styles.presetButton}
            >
              {minutes}m
            </button>
          ))}
        </div>
      )}
    </div>
  );
}; 