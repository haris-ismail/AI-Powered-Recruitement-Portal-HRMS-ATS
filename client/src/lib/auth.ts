import { jwtDecode } from 'jwt-decode';

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

export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

export const removeToken = (): void => {
  localStorage.removeItem('token');
};

export const getCurrentUser = (): User | null => {
  const token = getToken();
  if (!token) return null;

  try {
    const decoded: DecodedToken = jwtDecode(token);
    
    // Check if token is expired
    if (decoded.exp * 1000 < Date.now()) {
      removeToken();
      return null;
    }

    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
  } catch (error) {
    removeToken();
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  return getCurrentUser() !== null;
};

export const isAdmin = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'admin';
};

export const isCandidate = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'candidate';
};
