import { app, HttpRequest } from "@azure/functions";
import { Role } from "../../shared";
import { verifyToken } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { getHoldCoOpCoId } from "../../lib/opco";
import { ok, unauthorized, forbidden } from "../../lib/errors";

app.http("getCategories", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "categories",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();

    const url = new URL(req.url);
    const opCoIdParam = url.searchParams.get("opCoId") ?? undefined;

    let opCoId: string;

    if (claims.role === Role.HOLDCO_ADMIN || claims.role === Role.HOLDCO_MANAGER) {
      // Can query any OpCo's categories; default to HoldCo Internal
      opCoId = opCoIdParam ?? (await getHoldCoOpCoId());
    } else if (claims.role === Role.HOLDCO_USER) {
      opCoId = await getHoldCoOpCoId();
    } else {
      if (!claims.opCoId) return forbidden("No OpCo associated with this account");
      opCoId = claims.opCoId;
    }

    // Return OpCo-specific categories + shared categories (stored under HoldCo Internal)
    // HOLDCO_ADMIN sees ACTIVE + INACTIVE; all other roles see ACTIVE only
    const holdCoOpCoId = await getHoldCoOpCoId();
    const statusFilter = claims.role === Role.HOLDCO_ADMIN
      ? { in: ["ACTIVE", "INACTIVE"] }
      : "ACTIVE";
    const categories = await prisma.expenseCategory.findMany({
      where: {
        status: statusFilter,
        OR: [
          { opCoId },
          { isShared: true, opCoId: holdCoOpCoId },
        ],
      },
      orderBy: { name: "asc" },
    });

    // Deduplicate by name (OpCo-specific takes priority over shared)
    const seen = new Map<string, typeof categories[0]>();
    for (const cat of categories) {
      if (!seen.has(cat.name) || !cat.isShared) {
        seen.set(cat.name, cat);
      }
    }

    return ok(Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name)));
  },
});
