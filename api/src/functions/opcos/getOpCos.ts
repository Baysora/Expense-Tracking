import { app, HttpRequest } from "@azure/functions";
import { Role } from "../../shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ok, unauthorized, forbidden } from "../../lib/errors";

app.http("getOpCos", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "opcos",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.HOLDCO_ADMIN)) return forbidden();

    const opcos = await prisma.opCo.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true, expenses: true } },
      },
    });

    return ok(opcos);
  },
});
