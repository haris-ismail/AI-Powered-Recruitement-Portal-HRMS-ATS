import { useState, useEffect } from 'react';

// Migration utility for handling authentication state
export const useAuthMigration = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try to get user from server first (cookie-based)
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // Fallback to localStorage for backward compatibility
          const token = localStorage.getItem('token');
          if (token) {
            try {
              const { jwtDecode } = await import('jwt-decode');
              const decoded: any = jwtDecode(token);
              if (decoded.exp && decoded.exp * 1000 > Date.now()) {
                setUser({
                  id: decoded.id,
                  email: decoded.email,
                  role: decoded.role
                });
              } else {
                localStorage.removeItem('token');
              }
            } catch (error) {
              localStorage.removeItem('token');
            }
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logout = async () => {
    try {
      // Clear server-side cookies
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': localStorage.getItem('csrf_token') || '',
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear client-side storage
      localStorage.removeItem('token');
      localStorage.removeItem('csrf_token');
      setUser(null);
    }
  };

  return { user, loading, logout };
}; 