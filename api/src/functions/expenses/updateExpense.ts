import { app, HttpRequest } from "@azure/functions";
import { z } from "zod";
import { Role } from "../../shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { getHoldCoOpCoId } from "../../lib/opco";
import { ok, unauthorized, forbidden, badRequest, notFound } from "../../lib/errors";

const schema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  categoryId: z.string().min(1).optional(),
  departmentId: z.string().min(1).optional(),
  project: z.string().trim().max(200).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be updated" });

app.http("updateExpense", {
  methods: ["PATCH"],
  authLevel: "anonymous",
  route: "expenses/{id}",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.HOLDCO_ADMIN, Role.HOLDCO_MANAGER, Role.HOLDCO_USER, Role.OPCO_USER, Role.OPCO_ADMIN, Role.OPCO_MANAGER)) return forbidden();

    const id = req.params.id;

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const expense = await prisma.expense.findFirst({
      where: { id, submittedById: claims.userId },
      include: {
        category: true,
        opCo: true,
       },
     });

    if (!expense) return notFound("Expense not found");
    if (expense.status !== "DRAFT") return badRequest("Only draft expenses can be edited");

     // Resolve opCoId for validation
    let opCoId = claims.opCoId || expense.opCoId;
    if (!opCoId) {
      if (claims.role === Role.HOLDCO_ADMIN || claims.role === Role.HOLDCO_MANAGER || claims.role === Role.HOLDCO_USER) {
        opCoId = await getHoldCoOpCoId();
       } else {
        return forbidden("No OpCo associated with this account");
       }
     }

     // Validate category if changing
    if (parsed.data.categoryId !== undefined) {
      const category = await prisma.expenseCategory.findFirst({
        where: {
          id: parsed.data.categoryId,
          status: "ACTIVE",
          OR: [{ opCoId }, { isShared: true }],
         },
       });
      if (!category) return badRequest("Invalid or inactive category");
     }

     // Validate department if changing
    if (parsed.data.departmentId !== undefined) {
      const department = await prisma.department.findFirst({
        where: { id: parsed.data.departmentId, status: "ACTIVE", opCoId },
       });
      if (!department) return badRequest("Invalid or inactive department");
     }

    const project = parsed.data.project !== undefined
      ? (parsed.data.project?.trim().length ? parsed.data.project.trim() : null)
      : undefined;

    const updateData: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.amount !== undefined) updateData.amount = parsed.data.amount;
    if (parsed.data.currency !== undefined) updateData.currency = parsed.data.currency;
    if (parsed.data.categoryId !== undefined) updateData.categoryId = parsed.data.categoryId;
    if (parsed.data.departmentId !== undefined) updateData.departmentId = parsed.data.departmentId;
    if (parsed.data.project !== undefined) updateData.project = project;

    const updated = await prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { name: true } },
        department: { select: { name: true } },
       },
     });

    return ok({
       ...updated,
      amount: Number(updated.amount),
      categoryName: updated.category.name,
      departmentName: updated.department.name,
     });
   },
});
