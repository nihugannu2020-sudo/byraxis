import type { Book, Message } from '../types';

interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
  recommendations: Book[];
}

const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export async function sendMessage(messages: Message[]): Promise<ChatResponse> {
  const conversation: ApiMessage[] = messages.slice(-8).map(message => ({
    role: message.role === 'bot' ? 'assistant' : 'user',
    content: message.historyContent ?? message.content,
  }));

  const response = await fetch(`${apiUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: conversation }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const detail = typeof errorBody?.detail === 'string' ? `: ${errorBody.detail}` : '';
    throw new Error(`Backend request failed (${response.status})${detail}`);
  }

  const result = await response.json() as ChatResponse;
  return {
    ...result,
    recommendations: result.recommendations.map(book => ({
      ...book,
      id: `${book.title}-${book.author}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    })),
  };
}

interface GoogleBooksVolume {
  volumeInfo?: {
    imageLinks?: { thumbnail?: string };
    averageRating?: number;
  };
}

export async function enrichBookMetadata(book: Book): Promise<Book> {
  try {
    const query = encodeURIComponent(`intitle:${book.title} inauthor:${book.author}`);
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1&fields=items(volumeInfo/imageLinks,volumeInfo/averageRating)`,
    );
    if (!response.ok) return book;
    const data = await response.json() as { items?: GoogleBooksVolume[] };
    const volume = data.items?.[0]?.volumeInfo;
    const coverImage = volume?.imageLinks?.thumbnail?.replace('http://', 'https://');
    const rating = typeof volume?.averageRating === 'number' ? volume.averageRating : undefined;
    return { ...book, coverImage, rating };
  } catch {
    return book;
  }
}
