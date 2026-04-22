import { app, HttpRequest } from "@azure/functions";
import { z } from "zod";
import { Role } from "../../shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ok, unauthorized, forbidden, badRequest, notFound } from "../../lib/errors";

const schema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().max(500).optional(),
});

app.http("reviewExpense", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "expenses/{id}/review",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.HOLDCO_ADMIN, Role.OPCO_ADMIN, Role.OPCO_MANAGER)) return forbidden();

    const id = req.params.id;
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const where =
      claims.role === Role.HOLDCO_ADMIN
        ? { id }
        : { id, opCoId: claims.opCoId! };

    const expense = await prisma.expense.findFirst({ where });
    if (!expense) return notFound("Expense not found");
    if (expense.status !== "SUBMITTED") return badRequest("Only submitted expenses can be reviewed");

    if (expense.submittedById === claims.userId) {
      return forbidden("You cannot approve or reject your own expense");
    }

    const [approvalRecord, updatedExpense] = await prisma.$transaction([
      prisma.approvalRecord.create({
        data: {
          expenseId: id,
          action: parsed.data.action,
          comment: parsed.data.comment,
          reviewedById: claims.userId,
        },
      }),
      prisma.expense.update({
        where: { id },
        data: { status: parsed.data.action === "APPROVED" ? "APPROVED" : "REJECTED" },
      }),
    ]);

    return ok({ expense: { ...updatedExpense, amount: Number(updatedExpense.amount) }, approvalRecord });
  },
});
