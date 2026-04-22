import { app, HttpRequest } from "@azure/functions";
import { Role } from "../../shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { getHoldCoOpCoId } from "../../lib/opco";
import { ok, unauthorized, forbidden, badRequest, notFound } from "../../lib/errors";

app.http("submitExpense", {
  methods: ["PATCH"],
  authLevel: "anonymous",
  route: "expenses/{id}/submit",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.HOLDCO_ADMIN, Role.HOLDCO_USER, Role.OPCO_USER, Role.OPCO_ADMIN, Role.OPCO_MANAGER)) return forbidden();

    const id = req.params.id;

    const expense = await prisma.expense.findFirst({
      where: { id, submittedById: claims.userId },
      include: {
        category: true,
        opCo: true,
        _count: { select: { attachments: true } },
      },
    });

    if (!expense) return notFound("Expense not found");
    if (expense.status !== "DRAFT") return badRequest("Only draft expenses can be submitted");

    // Validate attachment rules
    if (expense._count.attachments === 0) {
      const opCo = expense.opCo;
      const category = expense.category;
      const amount = Number(expense.amount);

      const required =
        opCo.requireAttachmentForAll ||
        category.requiresAttachment ||
        (opCo.requireAttachmentAboveAmount !== null &&
          amount >= Number(opCo.requireAttachmentAboveAmount));

      if (required) {
        return badRequest("An attachment (receipt or invoice) is required for this expense");
      }
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: { status: "SUBMITTED" },
    });

    return ok({ ...updated, amount: Number(updated.amount) });
  },
});
