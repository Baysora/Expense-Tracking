import { HttpRequest } from "@azure/functions";
import jwt from "jsonwebtoken";
import { Role, TokenClaims } from "../shared";

const JWT_SECRET = process.env.JWT_SECRET;

export async function verifyToken(req: HttpRequest): Promise<TokenClaims | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);

  if (!JWT_SECRET) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    }) as TokenClaims & Record<string, unknown>;

    if (!payload.userId || !payload.email || !payload.role) return null;

    return {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role as Role,
      opCoId: payload.opCoId ?? null,
    };
  } catch {
    return null;
  }
}

export function requireRoles(claims: TokenClaims | null, ...roles: Role[]): claims is TokenClaims {
  if (!claims) return false;
  return roles.includes(claims.role);
}

export function requireOpCoAccess(claims: TokenClaims, opCoId: string): boolean {
  if (claims.role === Role.HOLDCO_ADMIN) return true;
  return claims.opCoId === opCoId;
}
