import { app, HttpRequest } from "@azure/functions";
import { z } from "zod";
import { Role } from "@expense/shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { created, unauthorized, forbidden, badRequest } from "../../lib/errors";

const schema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  amount: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  categoryId: z.string().min(1),
});

app.http("createExpense", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "expenses",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.OPCO_USER, Role.OPCO_ADMIN, Role.OPCO_MANAGER)) return forbidden();
    if (!claims.opCoId) return forbidden("No OpCo associated with this account");

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    // Verify category belongs to user's OpCo
    const category = await prisma.expenseCategory.findFirst({
      where: { id: parsed.data.categoryId, opCoId: claims.opCoId, isActive: true },
    });
    if (!category) return badRequest("Invalid or inactive category");

    const expense = await prisma.expense.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        categoryId: parsed.data.categoryId,
        submittedById: claims.userId,
        opCoId: claims.opCoId,
        status: "DRAFT",
      },
      include: { category: { select: { name: true } } },
    });

    return created({ ...expense, amount: Number(expense.amount), categoryName: expense.category.name });
  },
});
