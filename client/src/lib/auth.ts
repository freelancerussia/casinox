import { apiRequest } from './queryClient';
import { User } from '@shared/schema';

/**
 * Login a user with username and password
 * @param username The username
 * @param password The password
 * @returns The user data
 */
export async function login(username: string, password: string): Promise<User> {
  const response = await apiRequest('POST', '/api/auth/login', { username, password });
  return response.json();
}

/**
 * Register a new user
 * @param username The username
 * @param email The email
 * @param password The password
 * @returns The created user data
 */
export async function register(username: string, email: string, password: string): Promise<User> {
  const response = await apiRequest('POST', '/api/auth/register', { username, email, password });
  return response.json();
}

/**
 * Logout the current user
 */
export async function logout(): Promise<void> {
  await apiRequest('POST', '/api/auth/logout');
}

/**
 * Get the current authenticated user
 * @returns The user data or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await apiRequest('GET', '/api/auth/me');
    return response.json();
  } catch (error) {
    return null;
  }
}

/**
 * Check if a user has admin privileges
 * @param user The user to check
 * @returns True if the user is an admin
 */
export function isAdmin(user: User | null): boolean {
  return user?.isAdmin === true;
}
