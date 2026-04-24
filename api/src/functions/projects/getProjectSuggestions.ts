import { app, HttpRequest } from "@azure/functions";
import { Role } from "../../shared";
import { verifyToken } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { getHoldCoOpCoId } from "../../lib/opco";
import { ok, unauthorized, forbidden } from "../../lib/errors";

app.http("getProjectSuggestions", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "projects/suggestions",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();

    let opCoId: string;
    if (claims.role === Role.HOLDCO_ADMIN || claims.role === Role.HOLDCO_MANAGER || claims.role === Role.HOLDCO_USER) {
      opCoId = await getHoldCoOpCoId();
    } else {
      if (!claims.opCoId) return forbidden("No OpCo associated with this account");
      opCoId = claims.opCoId;
    }

    const rows = await prisma.expense.findMany({
      where: {
        opCoId,
        project: { not: null, ...(q ? { startsWith: q } : {}) },
      },
      select: { project: true },
      distinct: ["project"],
      orderBy: { project: "asc" },
      take: 10,
    });

    return ok(rows.map((r) => r.project).filter((p): p is string => !!p));
  },
});
