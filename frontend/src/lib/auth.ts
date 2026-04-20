import { Configuration, PublicClientApplication, AccountInfo } from "@azure/msal-browser";
import { Role, TokenClaims } from "@expense/shared";

const B2C_TENANT = import.meta.env.VITE_B2C_TENANT_NAME ?? "";
const B2C_POLICY = import.meta.env.VITE_B2C_POLICY_NAME ?? "B2C_1_signupsignin";
const B2C_CLIENT_ID = import.meta.env.VITE_B2C_CLIENT_ID ?? "";
const API_SCOPE = import.meta.env.VITE_API_SCOPE ?? "";
const DEV_MODE = import.meta.env.VITE_DEV_MODE === "true";

export const msalConfig: Configuration = {
  auth: {
    clientId: B2C_CLIENT_ID || "dev-client-id",
    authority: `https://${B2C_TENANT}.b2clogin.com/${B2C_TENANT}.onmicrosoft.com/${B2C_POLICY}`,
    knownAuthorities: [`${B2C_TENANT}.b2clogin.com`],
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: true, // IE11 / Edge compatibility
  },
};

export const loginRequest = {
  scopes: [API_SCOPE || "openid", "openid", "profile", "offline_access"],
};

export const msalInstance = new PublicClientApplication(msalConfig);

export function getClaimsFromAccount(account: AccountInfo | null): TokenClaims | null {
  if (!account) return null;
  const idTokenClaims = account.idTokenClaims as Record<string, unknown> | undefined;

  return {
    userId: account.localAccountId,
    email: account.username,
    name: account.name ?? "",
    role: (idTokenClaims?.["extension_role"] as Role) ?? Role.OPCO_USER,
    opCoId: (idTokenClaims?.["extension_opCoId"] as string) || null,
  };
}

// Dev-mode auth: stores credentials in sessionStorage for API calls
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
