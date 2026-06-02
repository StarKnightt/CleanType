import type { Entry } from '../types';

const ENTRIES_KEY = 'freewrite-entries';
const ENTRIES_FILE = 'entries.json';
const EXPORT_DEFAULT_NAME = 'cleantype-export.json';

/**
 * Detect whether we're running inside the Tauri shell. When false (e.g. plain
 * `vite` dev in a browser) we transparently fall back to localStorage so the
 * UI keeps working without the native APIs.
 */
function isTauri(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI__' in window || '__TAURI_IPC__' in window)
  );
}

function parseEntries(raw: string | null): Entry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Entry[]) : [];
  } catch {
    return [];
  }
}

function readLocal(): Entry[] {
  return parseEntries(localStorage.getItem(ENTRIES_KEY));
}

function writeLocal(entries: Entry[]): void {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

async function readDisk(): Promise<Entry[] | null> {
  if (!isTauri()) return null;
  try {
    const { readTextFile, exists, BaseDirectory } = await import('@tauri-apps/api/fs');
    if (!(await exists(ENTRIES_FILE, { dir: BaseDirectory.AppData }))) return null;
    return parseEntries(await readTextFile(ENTRIES_FILE, { dir: BaseDirectory.AppData }));
  } catch (error) {
    console.error('Failed to read entries from disk:', error);
    return null;
  }
}

async function writeDisk(entries: Entry[]): Promise<void> {
  if (!isTauri()) return;
  try {
    const { writeTextFile, createDir, exists, BaseDirectory } = await import('@tauri-apps/api/fs');
    // The app data directory may not exist on first launch.
    if (!(await exists('', { dir: BaseDirectory.AppData }).catch(() => false))) {
      await createDir('', { dir: BaseDirectory.AppData, recursive: true }).catch(() => undefined);
    }
    await writeTextFile(ENTRIES_FILE, JSON.stringify(entries, null, 2), {
      dir: BaseDirectory.AppData,
    });
  } catch (error) {
    console.error('Failed to write entries to disk:', error);
  }
}

/**
 * Load entries, preferring the local working copy for speed. If localStorage
 * was cleared (cache wipe) but a durable on-disk copy exists, restore from it.
 */
export async function loadEntries(): Promise<Entry[]> {
  const local = readLocal();
  if (local.length > 0) {
    const disk = await readDisk();
    if (!disk || disk.length === 0) void writeDisk(local);
    return local;
  }

  const disk = await readDisk();
  if (disk && disk.length > 0) {
    writeLocal(disk);
    return disk;
  }
  return [];
}

/** Persist entries to the fast local cache and the durable on-disk copy. */
export async function persistEntries(entries: Entry[]): Promise<void> {
  writeLocal(entries);
  await writeDisk(entries);
}

/**
 * Export all entries to a user-chosen file. Uses a native save dialog + a Rust
 * command in the desktop app (so arbitrary-path writes stay out of the webview
 * FS scope), and a Blob download when running in a plain browser.
 * Returns the chosen path, or null if the user cancelled.
 */
export async function exportEntries(entries: Entry[]): Promise<string | null> {
  const contents = JSON.stringify(entries, null, 2);

  if (!isTauri()) {
    const blob = new Blob([contents], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = EXPORT_DEFAULT_NAME;
    link.click();
    URL.revokeObjectURL(url);
    return EXPORT_DEFAULT_NAME;
  }

  const { save } = await import('@tauri-apps/api/dialog');
  const { invoke } = await import('@tauri-apps/api/tauri');
  const path = await save({
    defaultPath: EXPORT_DEFAULT_NAME,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (!path) return null;
  await invoke('export_data', { path, contents });
  return path;
}

/**
 * Import entries from a user-chosen file. Returns the parsed entries, or null
 * if cancelled / invalid.
 */
export async function importEntries(): Promise<Entry[] | null> {
  if (!isTauri()) return importFromBrowser();

  const { open } = await import('@tauri-apps/api/dialog');
  const { invoke } = await import('@tauri-apps/api/tauri');
  const selected = await open({
    multiple: false,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (!selected || Array.isArray(selected)) return null;

  const text = await invoke<string>('import_data', { path: selected });
  const parsed = parseEntries(text);
  return parsed.length > 0 ? parsed : null;
}

function importFromBrowser(): Promise<Entry[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => {
        const parsed = parseEntries(String(reader.result));
        resolve(parsed.length > 0 ? parsed : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}
