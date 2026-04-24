import { app, HttpRequest } from "@azure/functions";
import { z } from "zod";
import { Role } from "../../shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { getHoldCoOpCoId } from "../../lib/opco";
import { created, unauthorized, forbidden, badRequest, conflict, notFound } from "../../lib/errors";

const schema = z.object({
  opCoId: z.string().min(1),
  categoryId: z.string().min(1),
  departmentId: z.string().min(1),
  accountName: z.string().min(1).max(200),
});

app.http("createAccountMapping", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "account-mappings",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.HOLDCO_ADMIN)) return forbidden();

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);
    const { opCoId, categoryId, departmentId, accountName } = parsed.data;

    // Validate department belongs to target OpCo
    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) return notFound("Department not found");
    if (department.opCoId !== opCoId) {
      return badRequest("Department does not belong to the selected OpCo");
    }

    // Validate category belongs to target OpCo OR is a shared category under HoldCo
    const category = await prisma.expenseCategory.findUnique({ where: { id: categoryId } });
    if (!category) return notFound("Category not found");
    if (category.opCoId !== opCoId) {
      const holdCoOpCoId = await getHoldCoOpCoId();
      if (!(category.isShared && category.opCoId === holdCoOpCoId)) {
        return badRequest("Category is not available to the selected OpCo");
      }
    }

    const existing = await prisma.accountMapping.findUnique({
      where: { opCoId_categoryId_departmentId: { opCoId, categoryId, departmentId } },
    });
    if (existing) return conflict("A mapping for this Category + Department already exists in this OpCo");

    const mapping = await prisma.accountMapping.create({
      data: { opCoId, categoryId, departmentId, accountName: accountName.trim() },
    });

    return created(mapping);
  },
});
