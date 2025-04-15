export interface Entry {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  font: 'lato' | 'arial' | 'system' | 'serif' | 'script' | 'elegant' | 'classic' | 'playpen' | 'random';
  fontSize: string;
  theme: 'dark' | 'light';
} 