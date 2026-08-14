export interface Book {
  id: string;
  title: string;
  author: string;
  summary: string;
  genre: string;
  vibe: string;
  coverImage?: string;
  rating?: number;
}

export type Role = 'user' | 'bot';

export interface Message {
  id: string;
  role: Role;
  content: string;
  historyContent?: string;
  recommendations?: Book[];
}

export interface UserPreferences {
  category: string | null; // Keep compatibility
  mood: string | null;     // Keep compatibility
  keywords: string[];      // Keep compatibility
  
  // Extended preferences for true LLM reasoning
  genres?: string[];
  themes?: string[];
  tone?: string[];
  characterPreferences?: string[];
  preferredLength?: 'short' | 'medium' | 'long';
  dislikedGenres?: string[];
  dislikedThemes?: string[];
  favoriteAuthors?: string[];
  favoriteBooks?: string[];
  preferredRating?: number;
  otherPreferences?: string[];
}
