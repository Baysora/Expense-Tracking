import { app, HttpRequest } from "@azure/functions";
import { z } from "zod";
import { Role } from "@expense/shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { created, unauthorized, forbidden, badRequest, conflict } from "../../lib/errors";

const schema = z.object({
  name: z.string().min(1).max(100),
});

app.http("createCategory", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "categories",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.OPCO_ADMIN)) return forbidden();
    if (!claims.opCoId) return forbidden("No OpCo associated with this account");

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const existing = await prisma.expenseCategory.findFirst({
      where: { opCoId: claims.opCoId, name: parsed.data.name },
    });
    if (existing) return conflict("A category with this name already exists");

    const category = await prisma.expenseCategory.create({
      data: { name: parsed.data.name, opCoId: claims.opCoId },
    });

    return created(category);
  },
});
