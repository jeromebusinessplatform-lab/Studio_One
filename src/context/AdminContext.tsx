import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

interface AdminContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/session", { credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : { authenticated: false })
      .then((data: { authenticated?: boolean }) => setIsAuthenticated(Boolean(data.authenticated)))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (code: string) => {
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        return { success: false, error: data.error || "Invalid access code" };
      }
      setIsAuthenticated(true);
      return { success: true };
    } catch {
      return { success: false, error: "Unable to reach the authentication server" };
    }
  };

  const logout = () => {
    void fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" }).finally(() => {
      setIsAuthenticated(false);
    });
  };

  return <AdminContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
