import React, { createContext, useContext, useEffect, useState } from "react";
import { TokenClaims, Role } from "@expense/shared";
import {
  DEV_MODE,
  getDevUser,
  clearDevCredentials,
  msalInstance,
  loginRequest,
} from "./auth";

interface AuthContextValue {
  user: TokenClaims | null;
  isLoading: boolean;
  authError: string | null;
  logout: () => void;
  setDevUser: (user: TokenClaims) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  authError: null,
  logout: () => {},
  setDevUser: () => {},
});

async function fetchClaimsFromApi(accessToken: string): Promise<TokenClaims | null> {
  const res = await fetch("/api/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<TokenClaims>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TokenClaims | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      if (DEV_MODE) {
        setUser(getDevUser());
        setIsLoading(false);
        return;
      }

      try {
        await msalInstance.initialize();
        const result = await msalInstance.handleRedirectPromise();

        if (result?.accessToken) {
          // First sign-in redirect — use the access token from the redirect result
          const claims = await fetchClaimsFromApi(result.accessToken);
          if (!claims) {
            setAuthError("Your account is not yet provisioned. Please contact your administrator.");
          }
          setUser(claims);
        } else {
          // Page reload — silently refresh token if an account exists
          const accounts = msalInstance.getAllAccounts();
          if (accounts.length > 0) {
            try {
              const tokenResult = await msalInstance.acquireTokenSilent({
                ...loginRequest,
                account: accounts[0],
              });
              const claims = await fetchClaimsFromApi(tokenResult.accessToken);
              setUser(claims);
            } catch {
              // Silent refresh failed; user will need to sign in again
              await msalInstance.logoutRedirect({ onRedirectNavigate: () => false });
            }
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setIsLoading(false);
      }
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

  return (
    <AuthContext.Provider value={{ user, isLoading, authError, logout, setDevUser: setUser }}>
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
