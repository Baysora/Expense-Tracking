import { app, HttpRequest } from "@azure/functions";
import { verifyToken } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { Role, TokenClaims } from "../../shared";
import { ok, unauthorized } from "../../lib/errors";

app.http("getMe", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "me",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();

    // Read mustChangePassword from DB so the flag reflects reality after a
    // self-service change clears it (JWTs issued pre-change would still say true).
    const user = await prisma.user.findUnique({
      where: { id: claims.userId },
      select: { mustChangePassword: true, isActive: true },
    });
    if (!user || !user.isActive) return unauthorized();

    const fresh: TokenClaims = {
      userId: claims.userId,
      email: claims.email,
      name: claims.name,
      role: claims.role as Role,
      opCoId: claims.opCoId,
      mustChangePassword: user.mustChangePassword,
    };
    return ok(fresh);
  },
});
