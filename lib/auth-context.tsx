"use client";
import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react";
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

type AuthState = { user: User | null; loading: boolean };
type AuthAction =
  | { type: "init"; user: User | null }
  | { type: "set_user"; user: User | null };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "init": return { user: action.user, loading: false };
    case "set_user": return { ...state, user: action.user };
    default: return state;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [{ user, loading }, dispatch] = useReducer(authReducer, { user: null, loading: true });

  useEffect(() => {
    let initialUser: User | null = null;
    try {
      const stored = localStorage.getItem("crewwiki_user");
      if (stored) initialUser = JSON.parse(stored);
    } catch {}
    dispatch({ type: "init", user: initialUser });
  }, []);

  const login = useCallback(async (email: string, _password: string) => {
    // Demo: match by email, any password accepted
    const found = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found) return { success: false, error: "No account found with that email." };
    dispatch({ type: "set_user", user: found });
    localStorage.setItem("crewwiki_user", JSON.stringify(found));
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    dispatch({ type: "set_user", user: null });
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
