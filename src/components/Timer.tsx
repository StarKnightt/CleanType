import React, { useState } from 'react';
import styles from './Timer.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onStart: (minutes: number) => void;
  isDarkTheme: boolean;
}

const Timer: React.FC<Props> = ({ isOpen, onClose, onStart, isDarkTheme }) => {
  const [customTime, setCustomTime] = useState('15');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(customTime);
    if (!isNaN(mins) && mins > 0) {
      onStart(mins);
    }
  };

  const handlePresetClick = (mins: number) => {
    setCustomTime(mins.toString());
    onStart(mins);
  };

  if (!isOpen) return null;

  return (
    <div className={`${styles.overlay} ${isDarkTheme ? '' : styles.light}`}>
      <div className={styles.dialog}>
        <h2 className={styles.title}>Set Timer</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="number"
            className={styles.input}
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            min="1"
            max="120"
            placeholder="Enter minutes..."
          />
          <div className={styles.presets}>
            <button type="button" onClick={() => handlePresetClick(5)}>5m</button>
            <button type="button" onClick={() => handlePresetClick(15)}>15m</button>
            <button type="button" onClick={() => handlePresetClick(25)}>25m</button>
            <button type="button" onClick={() => handlePresetClick(30)}>30m</button>
          </div>
          <div className={styles.buttons}>
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" onClick={() => onStart(parseInt(customTime))}>Start</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Timer; 