export type FontStyle =
  | 'lato'
  | 'arial'
  | 'system'
  | 'serif'
  | 'script'
  | 'elegant'
  | 'classic'
  | 'playpen'
  | 'random';

export type Theme = 'dark' | 'light';

export interface Entry {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  font: FontStyle;
  fontSize: string;
  theme: Theme;
}
