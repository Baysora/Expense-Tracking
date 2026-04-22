 Plan: Replace Entra External ID with DB-based JWT Auth

 Context

 The app was built with Microsoft Entra External ID for production auth, but it
 requires significant Azure configuration (app registrations, custom token claims,
 user flows) that adds complexity without clear benefit for a small internal tool.
 The codebase already has a fully functional DB-based auth system used in dev mode:
 bcrypt password hashes on every User record, credential verification in auth.ts.

 The problem with "dev mode" as-is: it sends email:password (base64) on every
 API request. That's HTTP Basic Auth — safe over HTTPS but credentials are
 unnecessarily exposed on every call. The fix is to issue a proper signed JWT
 on login and verify that on subsequent requests.

 Goal: remove all Entra/MSAL code, issue our own JWTs after login, keep the same
 security model the rest of the code already assumes.

 ---
 How the current system works (what stays unchanged)

 - All handlers call verifyToken(req) → get TokenClaims (userId, email, name, role, opCoId)
 - requireRoles() and requireOpCoAccess() helpers gate endpoints
 - Users stored in DB with bcrypt passwordHash, role, opCoId
 - jsonwebtoken package is already a dependency in the API

 Nothing in the handler layer changes. Only the auth plumbing changes.

 ---
 What changes

 API

 api/src/lib/auth.ts — replace Entra JWKS verification with local JWT verify
 - Remove: JWKS client, Entra tenant URL, ENTRA_AUDIENCE env var
 - Remove: DEV_MODE branch entirely
 - Add: jwt.verify(token, JWT_SECRET) — verify our own signed tokens
 - Keep: requireRoles(), requireOpCoAccess() unchanged

 New file: api/src/functions/auth/login.ts
 - POST /api/auth/login — accepts { email, password }
 - Looks up user by email, verifies bcrypt password
 - On success: signs JWT with { userId, email, name, role, opCoId }, 8h expiry
 - Returns: { token, user: TokenClaims }
 - On failure: 401 (same message regardless of whether email exists — prevents enumeration)

 api/src/index.ts — add import "./functions/auth/login"

 api/local.settings.json — remove DEV_MODE, add JWT_SECRET

 Frontend

 frontend/src/lib/auth.ts — replace entire file
 - Remove: all MSAL config, msalInstance, scopes, getClaimsFromAccount()
 - Keep concept of: getAuthHeader(), token storage
 - New: store JWT in sessionStorage, getToken() / setToken() / clearToken()

 frontend/src/lib/AuthContext.tsx — replace Entra flow with JWT session
 - Remove: MSAL initialization, handleRedirectPromise, silent token acquire
 - New flow: on load, read JWT from sessionStorage → call /api/me to validate → set user
 - If /api/me returns 401 (expired/invalid token), clear token and redirect to login
 - logout() clears sessionStorage and redirects to /login

 frontend/src/lib/api.ts — simplify getAuthHeader()
 - Remove: MSAL acquireTokenSilent, redirect on silent fail
 - New: just return Bearer ${getToken()} from sessionStorage

 frontend/src/pages/Login.tsx — simplify
 - Remove: "Sign in with Microsoft" button, MSAL redirect
 - Keep: email + password form
 - On submit: POST to /api/auth/login, store returned JWT, redirect to role home

 frontend/package.json — remove @azure/msal-browser and @azure/msal-react

 frontend/.env — remove VITE_ENTRA_*, remove VITE_DEV_MODE

 CI / Deployment

 .github/workflows/azure-swa.yml
 - Remove: VITE_ENTRA_TENANT_NAME, VITE_ENTRA_CLIENT_ID, VITE_API_SCOPE, VITE_DEV_MODE
 - Remove: ENTRA_TENANT_NAME, ENTRA_AUDIENCE from API env
 - Add: JWT_SECRET: ${{ secrets.JWT_SECRET }} to API env

 GitHub Secrets (manual step for user)
 - Delete: ENTRA_TENANT_NAME, ENTRA_AUDIENCE, ENTRA_CLIENT_ID, ENTRA_API_SCOPE
 - Add: JWT_SECRET — a long random string (generate with openssl rand -base64 32)

 ---
 Files to modify

 ┌──────────────────────────────────┬───────────────────────────────────────────────────────┐
 │               File               │                        Action                         │
 ├──────────────────────────────────┼───────────────────────────────────────────────────────┤
 │ api/src/lib/auth.ts              │ Replace Entra/JWKS with jwt.verify(token, JWT_SECRET) │
 ├──────────────────────────────────┼───────────────────────────────────────────────────────┤
 │ api/src/functions/auth/login.ts  │ New — login endpoint                                  │
 ├──────────────────────────────────┼───────────────────────────────────────────────────────┤
 │ api/src/index.ts                 │ Add login import                                      │
 ├──────────────────────────────────┼───────────────────────────────────────────────────────┤
 │ api/local.settings.json          │ Remove DEV_MODE/ENTRA, add JWT_SECRET                 │
 ├──────────────────────────────────┼───────────────────────────────────────────────────────┤
 │ frontend/src/lib/auth.ts         │ Replace with simple JWT sessionStorage helpers        │
 ├──────────────────────────────────┼───────────────────────────────────────────────────────┤
 │ frontend/src/lib/AuthContext.tsx │ Replace MSAL flow with JWT session check              │
 ├──────────────────────────────────┼───────────────────────────────────────────────────────┤
 │ frontend/src/lib/api.ts          │ Simplify getAuthHeader to read from sessionStorage    │
 ├──────────────────────────────────┼───────────────────────────────────────────────────────┤
 │ frontend/src/pages/Login.tsx     │ POST to /api/auth/login, store JWT                    │
 ├──────────────────────────────────┼───────────────────────────────────────────────────────┤
 │ frontend/package.json            │ Remove @azure/msal-browser, @azure/msal-react         │
 ├──────────────────────────────────┼───────────────────────────────────────────────────────┤
 │ frontend/.env                    │ Remove VITE_ENTRA_*, VITE_DEV_MODE                    │
 ├──────────────────────────────────┼───────────────────────────────────────────────────────┤
 │ .github/workflows/azure-swa.yml  │ Remove ENTRA secrets, add JWT_SECRET                  │
 └──────────────────────────────────┴───────────────────────────────────────────────────────┘

 ---
 Security properties of the result

 - Credentials only sent once (at login POST)
 - JWT signed with HS256 + server-side secret
 - JWT expires in 8 hours
 - JWT stored in sessionStorage (cleared on tab close)
 - All traffic over HTTPS (Azure SWA enforces this)
 - Password stored as bcrypt (12 rounds) — unchanged
 - User enumeration prevented (same 401 for bad email or bad password)
 - No external identity provider dependency

 ---
 Verification

 1. Local: npm run dev:api + npm run dev:frontend
 2. POST http://localhost:7071/api/auth/login with valid credentials → get JWT
 3. GET http://localhost:7071/api/me with Authorization: Bearer <jwt> → get claims
 4. Login form in browser → verify redirect to correct dashboard by role
 5. Refresh page → stays logged in (JWT in sessionStorage)
 6. Click logout → cleared, redirected to /login
 7. After deploy: same smoke test against production URL
