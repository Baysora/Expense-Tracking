import { app, HttpRequest } from "@azure/functions";
import { Role } from "../../shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ok, unauthorized, forbidden } from "../../lib/errors";

app.http("getAccountMappings", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "account-mappings",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.HOLDCO_ADMIN)) return forbidden();

    const url = new URL(req.url);
    const opCoIdParam = url.searchParams.get("opCoId") ?? undefined;

    const mappings = await prisma.accountMapping.findMany({
      where: opCoIdParam ? { opCoId: opCoIdParam } : undefined,
      include: {
        category: { select: { name: true } },
        department: { select: { name: true } },
        opCo: { select: { name: true } },
      },
      orderBy: [{ opCoId: "asc" }, { accountName: "asc" }],
    });

    return ok(
      mappings.map((m) => ({
        id: m.id,
        opCoId: m.opCoId,
        opCoName: m.opCo.name,
        categoryId: m.categoryId,
        categoryName: m.category.name,
        departmentId: m.departmentId,
        departmentName: m.department.name,
        accountName: m.accountName,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      }))
    );
  },
});
