import { app, HttpRequest } from "@azure/functions";
import { Role } from "@expense/shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ok, unauthorized, forbidden } from "../../lib/errors";

app.http("getCategories", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "categories",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!claims.opCoId) return forbidden("No OpCo associated with this account");

    const categories = await prisma.expenseCategory.findMany({
      where: { opCoId: claims.opCoId, isActive: true },
      orderBy: { name: "asc" },
    });

    return ok(categories);
  },
});
