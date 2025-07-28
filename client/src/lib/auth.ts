import { jwtDecode } from 'jwt-decode';
import { useState, useEffect } from 'react';

interface DecodedToken {
  id: number;
  email: string;
  role: string;
  exp: number;
}

export interface User {
  id: number;
  email: string;
  role: string;
}

// CSRF token management (this is safe to store in localStorage as it's not the JWT)
export const getCsrfToken = (): string | null => {
  return localStorage.getItem('csrf_token');
};

export const setCsrfToken = (token: string): void => {
  localStorage.setItem('csrf_token', token);
};

export const removeCsrfToken = (): void => {
  localStorage.removeItem('csrf_token');
};

// Legacy token functions for backward compatibility during migration
export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

export const removeToken = (): void => {
  localStorage.removeItem('token');
};

// New cookie-based authentication functions
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // Make a request to get current user info from server
    const response = await fetch('/api/auth/me', {
      credentials: 'include', // Include cookies
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      return null;
    }

    const user = await response.json();
    return user;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
};

export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return user !== null;
};

export const isAdmin = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return user?.role === 'admin';
};

export const isCandidate = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return user?.role === 'candidate';
};

// Logout function
export const logout = async (): Promise<void> => {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken() || '',
      }
    });
  } catch (error) {
    console.error('Error during logout:', error);
  } finally {
    // Clear client-side tokens
    removeCsrfToken();
    removeToken(); // Legacy cleanup
  }
};

// Custom hook for managing user state
export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { user, loading, logout };
};
