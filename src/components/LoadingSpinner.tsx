import React from 'react';
import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  isDarkTheme?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium',
  isDarkTheme = false 
}) => {
  return (
    <div 
      className={`${styles.spinner} ${styles[size]} ${isDarkTheme ? styles.darkTheme : styles.lightTheme}`}
      role="progressbar"
      aria-label="Loading"
    >
      <div className={styles.inner}></div>
    </div>
  );
}; 