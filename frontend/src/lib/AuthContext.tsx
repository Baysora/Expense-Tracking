import React, { createContext, useContext, useEffect, useState } from "react";
import { TokenClaims, Role } from "@expense/shared";
import {
  DEV_MODE,
  getDevUser,
  clearDevCredentials,
  msalInstance,
  getClaimsFromAccount,
} from "./auth";

interface AuthContextValue {
  user: TokenClaims | null;
  isLoading: boolean;
  logout: () => void;
  setDevUser: (user: TokenClaims) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  logout: () => {},
  setDevUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TokenClaims | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      if (DEV_MODE) {
        const devUser = getDevUser();
        setUser(devUser);
        setIsLoading(false);
        return;
      }

      await msalInstance.initialize();
      const result = await msalInstance.handleRedirectPromise();
      if (result) {
        setUser(getClaimsFromAccount(result.account));
      } else {
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          setUser(getClaimsFromAccount(accounts[0]));
        }
      }
      setIsLoading(false);
    }
    init();
  }, []);

  function logout() {
    if (DEV_MODE) {
      clearDevCredentials();
      setUser(null);
      return;
    }
    msalInstance.logoutRedirect();
  }

  function setDevUserLocal(u: TokenClaims) {
    setUser(u);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, setDevUser: setDevUserLocal }}>
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
