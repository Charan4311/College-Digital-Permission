import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import api from '../lib/api';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('token');
    if (token) {
      api.get('/me')
        .then(res => setUser(res.data.data))
        .catch(() => Cookies.remove('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
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
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
