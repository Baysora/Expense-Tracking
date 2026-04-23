import { app, HttpRequest, HttpResponseInit } from "@azure/functions";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { Role, TokenClaims } from "../../shared";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY_HOURS = 8;

export async function login(req: HttpRequest): Promise<HttpResponseInit> {
  if (req.method !== "POST") {
    return { status: 405, body: "Method not allowed" };
  }

  if (!JWT_SECRET) {
    console.error("JWT_SECRET not configured");
    return { status: 500, body: "Server configuration error" };
  }

  let body: { email?: string; password?: string };
  try {
    body = (await req.json()) as { email?: string; password?: string };
  } catch {
    return { status: 400, body: "Invalid JSON" };
  }

  const { email, password } = body;

  if (!email || !password) {
    return { status: 400, body: "Email and password required" };
  }

  // Look up user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      opCoId: true,
      passwordHash: true,
      isActive: true,
    },
  });

  // Prevent enumeration: same error for bad email or bad password
  if (!user || !user.isActive) {
    return { status: 401, body: "Invalid email or password" };
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { status: 401, body: "Invalid email or password" };
  }

  // Build JWT claims
  const claims: TokenClaims = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    opCoId: user.opCoId,
  };

  // Sign JWT with HS256
  const token = jwt.sign(claims, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: `${JWT_EXPIRY_HOURS}h`,
  });

  return {
    status: 200,
    jsonBody: {
      token,
      user: claims,
    },
  };
}

app.http("authLogin", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "auth/login",
  handler: login,
});
