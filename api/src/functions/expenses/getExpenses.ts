import { app, HttpRequest } from "@azure/functions";
import { Role } from "@expense/shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ok, unauthorized, forbidden } from "../../lib/errors";

app.http("getExpenses", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "expenses",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!claims.opCoId) return forbidden("No OpCo associated with this account");

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;

    const where: Record<string, unknown> = { opCoId: claims.opCoId };
    if (status) where.status = status;

    // OPCO_USER only sees their own expenses
    if (claims.role === Role.OPCO_USER) {
      where.submittedById = claims.userId;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: { select: { name: true } },
        submittedBy: { select: { name: true, email: true } },
        _count: { select: { attachments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(
      expenses.map((e) => ({
        ...e,
        amount: Number(e.amount),
        categoryName: e.category.name,
        submittedByName: e.submittedBy.name,
        category: undefined,
        submittedBy: undefined,
      }))
    );
  },
});
