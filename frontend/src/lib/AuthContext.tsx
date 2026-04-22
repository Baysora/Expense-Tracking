import React, { createContext, useContext, useEffect, useState } from "react";
import { TokenClaims, Role } from "@expense/shared";
import { getToken, clearToken } from "./auth";

interface AuthContextValue {
  user: TokenClaims | null;
  isLoading: boolean;
  authError: string | null;
  logout: () => void;
  setUser: (user: TokenClaims) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  authError: null,
  logout: () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TokenClaims | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const token = getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/me", {
          headers: { "x-authorization": `Bearer ${token}` },
        });

        if (res.ok) {
          setUser(await res.json() as TokenClaims);
        } else {
          clearToken();
          setAuthError(res.status === 401 ? null : "Session error. Please sign in again.");
        }
      } catch {
        setAuthError("Connection failed.");
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  function logout() {
    clearToken();
    setUser(null);
    window.location.href = "/login";
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, authError, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useRequireRole(...roles: Role[]) {
  const { user } = useAuth();
  return user && roles.includes(user.role);
}
