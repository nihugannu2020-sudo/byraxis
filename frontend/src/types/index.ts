export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  author: string;
  category: string;
  description: string;
  coverImage: string;
  rating?: number;
  ratingsCount?: number;
  pageCount?: number;
  publishedDate?: string;
  previewLink?: string;
  infoLink?: string;
  moods: string[];
  romanceLevel?: 'low' | 'medium' | 'high';
  length?: 'short' | 'medium' | 'long';
  format?: 'standalone' | 'series';
}

export type Role = 'user' | 'bot';

export interface Message {
  id: string;
  role: Role;
  content: string;
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
