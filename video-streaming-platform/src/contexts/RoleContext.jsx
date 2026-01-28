import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const RoleContext = createContext();

export const ROLES = {
  VIEWER: 'viewer',
  EDITOR: 'editor',
  ADMIN: 'admin'
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within RoleProvider');
  }
  return context;
};

export const RoleProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI.getMe()
        .then(userData => {
          setUser({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            tenantId: userData.tenantId
          });
          setIsAuthenticated(true);
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const data = await authAPI.login(email, password);
      setUser(data.user);
      setIsAuthenticated(true);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const register = async (name, email, password, role = ROLES.VIEWER) => {
    try {
      const data = await authAPI.register(name, email, password, role);
      setUser(data.user);
      setIsAuthenticated(true);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const hasPermission = (requiredRole) => {
    if (!user) return false;
    const roleHierarchy = {
      [ROLES.VIEWER]: 1,
      [ROLES.EDITOR]: 2,
      [ROLES.ADMIN]: 3
    };
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>;
  }

  return (
    <RoleContext.Provider value={{
      user,
      isAuthenticated,
      login,
      register,
      logout,
      hasPermission
    }}>
      {children}
    </RoleContext.Provider>
  );
};
