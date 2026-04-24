import { app, HttpRequest } from "@azure/functions";
import { Role } from "../../shared";
import { verifyToken } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { getHoldCoOpCoId } from "../../lib/opco";
import { ok, unauthorized, forbidden } from "../../lib/errors";

app.http("getDepartments", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "departments",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();

    const url = new URL(req.url);
    const opCoIdParam = url.searchParams.get("opCoId") ?? undefined;

    let opCoId: string;

    if (claims.role === Role.HOLDCO_ADMIN || claims.role === Role.HOLDCO_MANAGER) {
      opCoId = opCoIdParam ?? (await getHoldCoOpCoId());
    } else if (claims.role === Role.HOLDCO_USER) {
      opCoId = await getHoldCoOpCoId();
    } else {
      if (!claims.opCoId) return forbidden("No OpCo associated with this account");
      opCoId = claims.opCoId;
    }

    const statusFilter = claims.role === Role.HOLDCO_ADMIN
      ? { in: ["ACTIVE", "INACTIVE"] }
      : "ACTIVE";

    const departments = await prisma.department.findMany({
      where: { opCoId, status: statusFilter },
      orderBy: { name: "asc" },
    });

    return ok(departments);
  },
});
