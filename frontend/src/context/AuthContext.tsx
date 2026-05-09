'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'manager' | 'capitan' | 'mesero' | 'cocina' | 'barra';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
}

// Simulamos una base de datos de usuarios
const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Admin Manager', role: 'manager', pin: '1234' },
  { id: 'u2', name: 'Capitán Roberto', role: 'capitan', pin: '5678' },
  { id: 'u3', name: 'Mesera Lucía', role: 'mesero', pin: '1111' },
  { id: 'u4', name: 'Mesero Juan', role: 'mesero', pin: '2222' },
];

interface AuthContextType {
  user: User | null;
  login: (pin: string) => boolean;
  logout: () => void;
  users: User[]; // Útil para asignar mesas a meseros
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  // En producción, aquí verificaríamos un token en sessionStorage/localStorage

  const login = (pin: string) => {
    const foundUser = MOCK_USERS.find(u => u.pin === pin);
    if (foundUser) {
      setUser(foundUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, users: MOCK_USERS }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
