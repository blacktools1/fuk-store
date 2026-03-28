"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type User = {
  name: string;
  email: string;
};

interface UserContextData {
  user: User | null;
  login: (name: string, email: string) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextData>({
  user: null,
  login: () => {},
  logout: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Load user from session storage on mount
    const stored = sessionStorage.getItem("store_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (err) {
        // Handle corrupt JSON
      }
    }
  }, []);

  const login = (name: string, email: string) => {
    const newUser = { name, email };
    setUser(newUser);
    sessionStorage.setItem("store_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("store_user");
  };

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
