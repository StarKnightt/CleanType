import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Entry, FontStyle, Theme } from '../types';
import { loadEntries, persistEntries } from '../lib/storage';

interface EntryDefaults {
  font: FontStyle;
  fontSize: string;
  theme: Theme;
}

const now = () => new Date().toISOString();

/**
 * Owns the list of entries and tracks the currently-open one by id (so there's
 * a single source of truth — no duplicated entry object to keep in sync). This
 * hook is the only writer to persistent storage, debounced, which removes the
 * previously-conflicting auto-save effects.
 */
export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const currentEntry = useMemo(
    () => entries.find((e) => e.id === currentId) ?? null,
    [entries, currentId],
  );

  useEffect(() => {
    let active = true;
    loadEntries().then((list) => {
      if (!active) return;
      setEntries(list);
      setCurrentId(list[0]?.id ?? null);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Single debounced persistence path for any change to the entry list.
  useEffect(() => {
    if (!loaded) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persistEntries(entries);
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [entries, loaded]);

  const createEntry = useCallback((defaults: EntryDefaults, content = ''): Entry => {
    const entry: Entry = {
      id: Date.now().toString(),
      content,
      title: 'Untitled',
      createdAt: now(),
      updatedAt: now(),
      ...defaults,
    };
    setEntries((prev) => [entry, ...prev]);
    setCurrentId(entry.id);
    return entry;
  }, []);

  /** Update the active entry in place (no reordering) — used by auto-save. */
  const updateCurrent = useCallback(
    (patch: Partial<Entry>) => {
      if (!currentId) return;
      setEntries((prev) =>
        prev.map((e) => (e.id === currentId ? { ...e, ...patch, updatedAt: now() } : e)),
      );
    },
    [currentId],
  );

  const selectEntry = useCallback((entry: Entry) => {
    setCurrentId(entry.id);
  }, []);

  const deleteEntry = useCallback(
    (id: string) => {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      if (currentId === id) setCurrentId(null);
    },
    [currentId],
  );

  const clearAll = useCallback(() => {
    setEntries([]);
    setCurrentId(null);
  }, []);

  const renameEntry = useCallback((id: string, title: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, title } : e)));
  }, []);

  /** Move the active entry to the top of history (manual "Save" checkpoint). */
  const promoteCurrent = useCallback(() => {
    if (!currentId) return;
    setEntries((prev) => {
      const target = prev.find((e) => e.id === currentId);
      if (!target) return prev;
      return [target, ...prev.filter((e) => e.id !== currentId)];
    });
  }, [currentId]);

  /** Replace all entries (used by import). */
  const replaceAll = useCallback((next: Entry[]) => {
    setEntries(next);
    setCurrentId(next[0]?.id ?? null);
  }, []);

  return {
    entries,
    currentEntry,
    loaded,
    createEntry,
    updateCurrent,
    selectEntry,
    deleteEntry,
    clearAll,
    renameEntry,
    promoteCurrent,
    replaceAll,
  };
}
