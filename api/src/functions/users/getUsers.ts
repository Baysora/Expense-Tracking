import { app, HttpRequest } from "@azure/functions";
import { Role } from "../../shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { isHoldCoRole } from "../../lib/opco";
import { ok, unauthorized, forbidden } from "../../lib/errors";

app.http("getUsers", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "users",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.HOLDCO_ADMIN, Role.HOLDCO_MANAGER, Role.OPCO_ADMIN, Role.OPCO_MANAGER)) return forbidden();

    const where = isHoldCoRole(claims.role)
      ? {}
      : { opCoId: claims.opCoId! };

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        opCoId: true,
        opCo: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(
      users.map((u) => ({
        ...u,
        opCoName: u.opCo?.name ?? null,
        opCo: undefined,
      }))
    );
  },
});
