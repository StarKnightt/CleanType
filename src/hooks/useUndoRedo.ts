import { useCallback, useRef, useState } from 'react';

const MAX_HISTORY = 200;

export interface UndoRedo {
  value: string;
  /** Update the value, recording the previous value for undo. */
  set: (next: string) => void;
  /** Replace the value without recording history (e.g. loading an entry). */
  reset: (next: string) => void;
  undo: () => void;
  redo: () => void;
}

/**
 * Lightweight undo/redo for a single string value. History lives in refs and is
 * capped, so a long writing session never grows memory without bound.
 */
export function useUndoRedo(initial: string): UndoRedo {
  const [value, setValue] = useState(initial);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);

  const set = useCallback((next: string) => {
    setValue((prev) => {
      if (next === prev) return prev;
      undoStack.current.push(prev);
      if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
      redoStack.current = [];
      return next;
    });
  }, []);

  const reset = useCallback((next: string) => {
    undoStack.current = [];
    redoStack.current = [];
    setValue(next);
  }, []);

  const undo = useCallback(() => {
    setValue((prev) => {
      if (undoStack.current.length === 0) return prev;
      const previous = undoStack.current.pop() as string;
      redoStack.current.push(prev);
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setValue((prev) => {
      if (redoStack.current.length === 0) return prev;
      const next = redoStack.current.pop() as string;
      undoStack.current.push(prev);
      return next;
    });
  }, []);

  return { value, set, reset, undo, redo };
}
