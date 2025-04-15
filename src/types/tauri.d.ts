declare module '@tauri-apps/api/dialog' {
  export function save(options: { filters: Array<{ name: string; extensions: string[] }> }): Promise<string | null>;
}

declare module '@tauri-apps/api/fs' {
  export function writeTextFile(path: string, contents: string): Promise<void>;
} 