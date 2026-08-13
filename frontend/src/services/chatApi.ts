import type { Book, Message } from '../types';

interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
  recommendations?: Book[];
}

const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export async function sendMessage(messages: Message[]): Promise<ChatResponse> {
  const conversation: ApiMessage[] = messages.map(message => ({
    role: message.role === 'bot' ? 'assistant' : 'user',
    content: message.content,
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

  return response.json() as Promise<ChatResponse>;
}
