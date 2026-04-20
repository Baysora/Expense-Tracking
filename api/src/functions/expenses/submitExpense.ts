import { app, HttpRequest } from "@azure/functions";
import { Role } from "@expense/shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ok, unauthorized, forbidden, badRequest, notFound } from "../../lib/errors";

app.http("submitExpense", {
  methods: ["PATCH"],
  authLevel: "anonymous",
  route: "expenses/{id}/submit",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.OPCO_USER, Role.OPCO_ADMIN, Role.OPCO_MANAGER)) return forbidden();
    if (!claims.opCoId) return forbidden();

    const id = req.params.id;

    const expense = await prisma.expense.findFirst({
      where: { id, opCoId: claims.opCoId, submittedById: claims.userId },
    });

    if (!expense) return notFound("Expense not found");
    if (expense.status !== "DRAFT") return badRequest("Only draft expenses can be submitted");

    const updated = await prisma.expense.update({
      where: { id },
      data: { status: "SUBMITTED" },
    });

    return ok({ ...updated, amount: Number(updated.amount) });
  },
});
