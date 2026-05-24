"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { User, Role } from "@/types";
import { MOCK_USERS } from "@/lib/data";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  canEdit: boolean;
  canAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const EDIT_ROLES: Role[] = ["coach", "captain", "admin"];
const ADMIN_ROLES: Role[] = ["admin"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("crewwiki_user");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, _password: string) => {
    // Demo: match by email, any password accepted
    const found = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found) return { success: false, error: "No account found with that email." };
    setUser(found);
    localStorage.setItem("crewwiki_user", JSON.stringify(found));
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("crewwiki_user");
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading,
      login, logout,
      canEdit: !!user && EDIT_ROLES.includes(user.role),
      canAdmin: !!user && ADMIN_ROLES.includes(user.role),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
