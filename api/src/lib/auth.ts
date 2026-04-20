import { HttpRequest } from "@azure/functions";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { Role, TokenClaims } from "@expense/shared";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

const B2C_TENANT = process.env.B2C_TENANT_NAME;
const B2C_POLICY = process.env.B2C_POLICY_NAME;
const B2C_AUDIENCE = process.env.B2C_AUDIENCE;
const DEV_MODE = process.env.DEV_MODE === "true";

let jwksClientInstance: ReturnType<typeof jwksClient> | null = null;

function getJwksClient() {
  if (!jwksClientInstance && B2C_TENANT && B2C_POLICY) {
    jwksClientInstance = jwksClient({
      jwksUri: `https://${B2C_TENANT}.b2clogin.com/${B2C_TENANT}.onmicrosoft.com/${B2C_POLICY}/discovery/v2.0/keys`,
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
  // Dev mode: authenticate via email/password in Authorization header (Basic auth)
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
      audience: B2C_AUDIENCE,
    }) as Record<string, unknown>;

    return {
      userId: payload["sub"] as string,
      email: payload["emails"]?.[0] as string ?? payload["email"] as string,
      name: payload["name"] as string ?? "",
      role: (payload["extension_role"] as Role) ?? Role.OPCO_USER,
      opCoId: (payload["extension_opCoId"] as string) || null,
    };
  } catch {
    return null;
  }
}

async function verifyDevToken(req: HttpRequest): Promise<TokenClaims | null> {
  // Dev-only: accept Basic auth (email:password) and look up user in DB
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  if (authHeader.startsWith("Bearer dev:")) {
    // Bearer dev:{email}:{password}
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

  return null;
}

export function requireRoles(claims: TokenClaims | null, ...roles: Role[]): claims is TokenClaims {
  if (!claims) return false;
  return roles.includes(claims.role);
}

export function requireOpCoAccess(claims: TokenClaims, opCoId: string): boolean {
  if (claims.role === Role.HOLDCO_ADMIN) return true;
  return claims.opCoId === opCoId;
}
