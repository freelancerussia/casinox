
import { apiRequest } from './queryClient';
import { User } from '@shared/schema';

const AUTH_TOKEN_KEY = 'user';

export function getAuthToken(): string | null {
  const user = localStorage.getItem(AUTH_TOKEN_KEY);
  if (user) {
    try {
      const userData = JSON.parse(user);
      return userData.token;
    } catch (e) {
      console.error('Error parsing user data from localStorage:', e);
    }
  }
  return null;
}

export function setAuthToken(user: any): void {
  localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(user));
}

export function removeAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export async function login(username: string, password: string): Promise<User> {
  const response = await apiRequest('POST', '/api/auth/login', { username, password });
  const userData = await response.json();
  setAuthToken(userData);
  return userData;
}

export async function register(username: string, email: string, password: string): Promise<User> {
  const response = await apiRequest('POST', '/api/auth/register', { username, email, password });
  const userData = await response.json();
  setAuthToken(userData);
  return userData;
}

export async function logout(): Promise<void> {
  await apiRequest('POST', '/api/auth/logout');
  removeAuthToken();
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await apiRequest('GET', '/api/auth/me');
    return response.json();
  } catch (error) {
    return null;
  }
}

export function isAdmin(user: User | null): boolean {
  return user?.isAdmin === true;
}
