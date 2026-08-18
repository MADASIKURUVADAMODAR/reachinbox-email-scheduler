import React, { createContext, useContext, useEffect, useState } from 'react';
import type { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loginWithGoogleToken: (credentialToken: string) => void;
  loginWithCustomUser: (user: UserProfile) => void;
  logout: () => void;
}

const STORAGE_KEY = 'reachinbox_user_profile';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const loginWithGoogleToken = (credentialToken: string) => {
    try {
      // Decode JWT payload safely
      const base64Url = credentialToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);

      const profile: UserProfile = {
        id: payload.sub || Math.random().toString(),
        name: payload.name || payload.given_name || 'Google User',
        email: payload.email || 'user@example.com',
        picture: payload.picture,
      };

      setUser(profile);
    } catch (err) {
      console.error('Failed to parse Google credential token:', err);
    }
  };

  const loginWithCustomUser = (profile: UserProfile) => {
    setUser(profile);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loginWithGoogleToken,
        loginWithCustomUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
