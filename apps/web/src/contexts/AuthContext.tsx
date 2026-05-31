import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "../lib/api";

interface User {
  id: string;
  name: string;
  email: string;
  onboarded: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ user: User }>("/auth/me")
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { user } = await api.post<{ user: User }>("/auth/login", { email, password });
    setUser(user);
  };

  const register = async (name: string, email: string, password: string) => {
    const { user } = await api.post<{ user: User }>("/auth/register", { name, email, password });
    setUser(user);
  };

  const logout = async () => {
    await api.post("/auth/logout", {});
    setUser(null);
  };

  const completeOnboarding = async () => {
    await api.post("/auth/complete-onboarding", {});
    setUser((u) => (u ? { ...u, onboarded: true } : u));
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, completeOnboarding }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
