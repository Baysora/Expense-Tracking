import { Configuration, PublicClientApplication, AccountInfo } from "@azure/msal-browser";
import { Role, TokenClaims } from "@expense/shared";

const ENTRA_TENANT = import.meta.env.VITE_ENTRA_TENANT_NAME ?? "";
const ENTRA_CLIENT_ID = import.meta.env.VITE_ENTRA_CLIENT_ID ?? "";
const API_SCOPE = import.meta.env.VITE_API_SCOPE ?? "";
const DEV_MODE = import.meta.env.VITE_DEV_MODE === "true";

export const msalConfig: Configuration = {
  auth: {
    clientId: ENTRA_CLIENT_ID || "dev-client-id",
    // Entra External ID (CIAM) — no policy slug in authority
    authority: `https://${ENTRA_TENANT}.ciamlogin.com/${ENTRA_TENANT}.onmicrosoft.com/`,
    knownAuthorities: [`${ENTRA_TENANT}.ciamlogin.com`],
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: true,
  },
};

export const loginRequest = {
  scopes: [...(API_SCOPE ? [API_SCOPE] : []), "openid", "profile", "offline_access"],
};

export const msalInstance = new PublicClientApplication(msalConfig);

export function getClaimsFromAccount(account: AccountInfo | null): TokenClaims | null {
  if (!account) return null;
  const claims = account.idTokenClaims as Record<string, unknown> | undefined;

  return {
    userId: account.localAccountId,
    // Entra External ID surfaces email as `email` claim; fall back to username (UPN)
    email: (claims?.["email"] as string) ?? account.username,
    name: account.name ?? "",
    role: (claims?.["extension_role"] as Role) ?? Role.OPCO_USER,
    opCoId: (claims?.["extension_opCoId"] as string) || null,
  };
}

// ── Dev-mode auth (local only, VITE_DEV_MODE=true) ──────────────────────────

export interface DevCredentials {
  email: string;
  password: string;
}

export function setDevCredentials(creds: DevCredentials): void {
  sessionStorage.setItem("dev_creds", JSON.stringify(creds));
}

export function getDevAuthHeader(): string | null {
  const raw = sessionStorage.getItem("dev_creds");
  if (!raw) return null;
  const { email, password } = JSON.parse(raw) as DevCredentials;
  const encoded = btoa(`${email}:${password}`);
  return `Bearer dev:${encoded}`;
}

export function clearDevCredentials(): void {
  sessionStorage.removeItem("dev_creds");
  sessionStorage.removeItem("dev_user");
}

export function setDevUser(user: TokenClaims): void {
  sessionStorage.setItem("dev_user", JSON.stringify(user));
}

export function getDevUser(): TokenClaims | null {
  const raw = sessionStorage.getItem("dev_user");
  return raw ? (JSON.parse(raw) as TokenClaims) : null;
}

export { DEV_MODE };
