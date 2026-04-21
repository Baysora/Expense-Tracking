import { HttpRequest } from "@azure/functions";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { Role, TokenClaims } from "@expense/shared";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

const ENTRA_TENANT = process.env.ENTRA_TENANT_NAME;
const ENTRA_AUDIENCE = process.env.ENTRA_AUDIENCE;
const DEV_MODE = process.env.DEV_MODE === "true";

let jwksClientInstance: ReturnType<typeof jwksClient> | null = null;

function getJwksClient() {
  if (!jwksClientInstance && ENTRA_TENANT) {
    // Entra External ID (CIAM) JWKS endpoint — no policy slug
    jwksClientInstance = jwksClient({
      jwksUri: `https://${ENTRA_TENANT}.ciamlogin.com/${ENTRA_TENANT}.onmicrosoft.com/discovery/v2.0/keys`,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000,
    });
  }
  return jwksClientInstance;
}

async function getSigningKey(kid: string): Promise<string> {
  const client = getJwksClient();
  if (!client) throw new Error("JWKS client not configured");
  const key = await client.getSigningKey(kid);
  return key.getPublicKey();
}

export async function verifyToken(req: HttpRequest): Promise<TokenClaims | null> {
  if (DEV_MODE) {
    return verifyDevToken(req);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === "string") return null;

    const kid = decoded.header.kid;
    if (!kid) return null;

    const publicKey = await getSigningKey(kid);
    const payload = jwt.verify(token, publicKey, {
      algorithms: ["RS256"],
      audience: ENTRA_AUDIENCE,
    }) as Record<string, unknown>;

    return {
      userId: payload["sub"] as string,
      // Entra External ID uses `email` claim (not `emails[]` array like B2C)
      email: (payload["email"] as string) ?? (payload["preferred_username"] as string) ?? "",
      name: (payload["name"] as string) ?? "",
      role: (payload["extension_role"] as Role) ?? Role.OPCO_USER,
      opCoId: (payload["extension_opCoId"] as string) || null,
    };
  } catch {
    return null;
  }
}

// Dev-only: accepts Bearer dev:<base64(email:password)>, looks up user in DB
async function verifyDevToken(req: HttpRequest): Promise<TokenClaims | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer dev:")) return null;

  const credentials = Buffer.from(authHeader.slice(11), "base64").toString();
  const colonIdx = credentials.indexOf(":");
  if (colonIdx === -1) return null;
  const email = credentials.slice(0, colonIdx);
  const password = credentials.slice(colonIdx + 1);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, opCoId: true, passwordHash: true, isActive: true },
  });

  if (!user || !user.isActive) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    opCoId: user.opCoId,
  };
}

export function requireRoles(claims: TokenClaims | null, ...roles: Role[]): claims is TokenClaims {
  if (!claims) return false;
  return roles.includes(claims.role);
}

export function requireOpCoAccess(claims: TokenClaims, opCoId: string): boolean {
  if (claims.role === Role.HOLDCO_ADMIN) return true;
  return claims.opCoId === opCoId;
}
