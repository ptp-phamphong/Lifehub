import * as SecureStore from 'expo-secure-store';
import { getApiBaseUrl } from '../config';

const TOKEN_KEY = 'auth_token';
const EXPIRATION_KEY = 'auth_expiration';

export interface LoginResponse {
  token: string;
  expiration: string;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${getApiBaseUrl()}/Auth/Login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(response.status === 401 ? 'Invalid credentials' : 'Server error');
  }

  const data: LoginResponse = await response.json();

  await SecureStore.setItemAsync(TOKEN_KEY, data.token);
  await SecureStore.setItemAsync(EXPIRATION_KEY, data.expiration);

  return data;
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(EXPIRATION_KEY);
}

export async function getToken(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) return null;

  const expiration = await SecureStore.getItemAsync(EXPIRATION_KEY);
  if (!expiration || new Date(expiration) <= new Date()) {
    await logout();
    return null;
  }

  return token;
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return token !== null;
}
