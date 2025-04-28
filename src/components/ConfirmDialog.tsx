import React from 'react';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDarkTheme: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isDarkTheme,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={`${styles.dialog} ${isDarkTheme ? styles.darkTheme : styles.lightTheme}`}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.confirmButton} onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}; 