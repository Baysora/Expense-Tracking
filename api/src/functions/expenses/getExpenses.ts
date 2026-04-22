import { app, HttpRequest } from "@azure/functions";
import { Role } from "../../shared";
import { verifyToken } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { getHoldCoOpCoId, isHoldCoRole } from "../../lib/opco";
import { ok, unauthorized, forbidden } from "../../lib/errors";

app.http("getExpenses", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "expenses",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const opCoIdParam = url.searchParams.get("opCoId") ?? undefined;
    const mine = url.searchParams.get("mine") === "true";

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    if (claims.role === Role.HOLDCO_ADMIN || claims.role === Role.HOLDCO_MANAGER) {
      // Can see all expenses, optionally filtered by OpCo
      if (opCoIdParam) where.opCoId = opCoIdParam;
      if (mine) where.submittedById = claims.userId;
    } else if (claims.role === Role.HOLDCO_USER) {
      // Only own expenses within the HoldCo Internal OpCo
      const holdCoOpCoId = await getHoldCoOpCoId();
      where.opCoId = holdCoOpCoId;
      where.submittedById = claims.userId;
    } else {
      if (!claims.opCoId) return forbidden("No OpCo associated with this account");
      where.opCoId = claims.opCoId;
      if (claims.role === Role.OPCO_USER) {
        where.submittedById = claims.userId;
      }
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: { select: { name: true } },
        submittedBy: { select: { name: true, email: true } },
        opCo: { select: { name: true } },
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
        opCoName: e.opCo.name,
        category: undefined,
        submittedBy: undefined,
        opCo: undefined,
      }))
    );
  },
});
