
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient();

export async function apiRequest(method: string, path: string, body?: any) {
  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('API request failed');
  }

  return response;
}
