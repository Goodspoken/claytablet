import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  provider: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUser = useCallback(async () => {
    try {
      const data = await api.getMe();
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      // Token is already set in cookie by backend; clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Return to the room the user was trying to access before OAuth
      const returnTo = localStorage.getItem('returnTo');
      if (returnTo) {
        localStorage.removeItem('returnTo');
        navigate(returnTo, { replace: true });
      }
    }

    fetchUser();
  }, [fetchUser, navigate]);

  const logout = async () => {
    try {
      await api.logout();
      setUser(null);
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  return { user, isLoading, logout, fetchUser };
}
