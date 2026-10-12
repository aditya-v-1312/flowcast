import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser } from '../types/index.js';
import api from '../api/client.js';

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, userData: IUser) => void;
  logout: () => void;
  updateUser: (userData: IUser) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('flowcast_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('flowcast_user');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse saved user', e);
      }
    }
    setLoading(false);
  }, [token]);

  const login = (newToken: string, userData: IUser) => {
    localStorage.setItem('flowcast_token', newToken);
    localStorage.setItem('flowcast_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('flowcast_token');
    localStorage.removeItem('flowcast_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (userData: IUser) => {
    localStorage.setItem('flowcast_user', JSON.stringify(userData));
    setUser(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        login,
        logout,
        updateUser,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
