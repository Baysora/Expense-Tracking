import { app, HttpRequest } from "@azure/functions";
import { Role } from "@expense/shared";
import { verifyToken } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { generateSasUrl } from "../../lib/blob";
import { ok, unauthorized, forbidden, notFound } from "../../lib/errors";

app.http("getExpenseById", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "expenses/{id}",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!claims.opCoId) return forbidden();

    const id = req.params.id;

    const expense = await prisma.expense.findFirst({
      where: { id, opCoId: claims.opCoId },
      include: {
        category: { select: { name: true } },
        submittedBy: { select: { name: true, email: true } },
        attachments: true,
        approvalRecords: {
          include: { reviewedBy: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!expense) return notFound("Expense not found");

    // OPCO_USER can only view their own expenses
    if (claims.role === Role.OPCO_USER && expense.submittedById !== claims.userId) {
      return forbidden();
    }

    // Generate SAS URLs for attachments
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
      category: undefined,
      submittedBy: undefined,
      attachments: attachmentsWithUrls,
      approvalRecords: expense.approvalRecords.map((r) => ({
        ...r,
        reviewedByName: r.reviewedBy.name,
        reviewedBy: undefined,
      })),
    });
  },
});
