import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import api from '../lib/api';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const token = Cookies.get('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const res = await api.get('/me');
      const nextUser = res.data.data;
      setUser(nextUser ? { ...nextUser, profileImage: nextUser.profileImage || '' } : null);
      return nextUser;
    } catch (error) {
      Cookies.remove('token');
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (updater) => {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;
      const nextUser = typeof updater === 'function' ? updater(currentUser) : updater;
      return nextUser ? { ...nextUser, profileImage: nextUser.profileImage || '' } : null;
    });
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', {
      username: username.trim(),
      password: password.trim()
    });
    const { token, user: userData } = res.data.data;
    Cookies.set('token', token, { expires: 1 });
    setUser(userData);
    return userData;
  };

  const logout = () => {
    Cookies.remove('token');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, updateUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
