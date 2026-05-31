import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "../lib/api";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isNewUser: boolean;
  clearNewUser: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

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
    setIsNewUser(true);
  };

  const clearNewUser = () => setIsNewUser(false);

  const logout = async () => {
    await api.post("/auth/logout", {});
    setUser(null);
    setIsNewUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isNewUser, clearNewUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
