import { app, HttpRequest } from "@azure/functions";
import { Role } from "@expense/shared";
import { verifyToken } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { getHoldCoOpCoId } from "../../lib/opco";
import { generateSasUrl } from "../../lib/blob";
import { ok, unauthorized, forbidden, notFound } from "../../lib/errors";

app.http("getExpenseById", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "expenses/{id}",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();

    const id = req.params.id;

    const includeOpts = {
      category: { select: { name: true } },
      submittedBy: { select: { name: true, email: true } },
      opCo: { select: { name: true } },
      attachments: true,
      approvalRecords: {
        include: { reviewedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" as const },
      },
    };

    let expense;

    if (claims.role === Role.HOLDCO_ADMIN) {
      expense = await prisma.expense.findFirst({ where: { id }, include: includeOpts });
    } else if (claims.role === Role.HOLDCO_USER) {
      const holdCoOpCoId = await getHoldCoOpCoId();
      expense = await prisma.expense.findFirst({
        where: { id, opCoId: holdCoOpCoId, submittedById: claims.userId },
        include: includeOpts,
      });
    } else {
      if (!claims.opCoId) return forbidden();
      expense = await prisma.expense.findFirst({
        where: { id, opCoId: claims.opCoId },
        include: includeOpts,
      });
      if (expense && claims.role === Role.OPCO_USER && expense.submittedById !== claims.userId) {
        return forbidden();
      }
    }

    if (!expense) return notFound("Expense not found");

    const attachmentsWithUrls = await Promise.all(
      expense.attachments.map(async (a) => ({
        ...a,
        sasUrl: await generateSasUrl(a.blobName),
      }))
    );

    return ok({
      ...expense,
      amount: Number(expense.amount),
      categoryName: expense.category.name,
      submittedByName: expense.submittedBy.name,
      opCoName: expense.opCo.name,
      category: undefined,
      submittedBy: undefined,
      opCo: undefined,
      attachments: attachmentsWithUrls,
      approvalRecords: expense.approvalRecords.map((r) => ({
        ...r,
        reviewedByName: r.reviewedBy.name,
        reviewedBy: undefined,
      })),
    });
  },
});
