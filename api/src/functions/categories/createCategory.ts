import { app, HttpRequest } from "@azure/functions";
import { z } from "zod";
import { Role } from "@expense/shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { getHoldCoOpCoId } from "../../lib/opco";
import { created, unauthorized, forbidden, badRequest, conflict } from "../../lib/errors";

const schema = z.object({
  name: z.string().min(1).max(100),
  opCoId: z.string().min(1),
  isShared: z.boolean().optional().default(false),
  requiresAttachment: z.boolean().optional().default(false),
});

app.http("createCategory", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "categories",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.HOLDCO_ADMIN)) return forbidden();

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    // Shared categories are stored under the HoldCo Internal OpCo
    let targetOpCoId = parsed.data.opCoId;
    if (parsed.data.isShared) {
      targetOpCoId = await getHoldCoOpCoId();
    }

    const existing = await prisma.expenseCategory.findFirst({
      where: { opCoId: targetOpCoId, name: parsed.data.name },
    });
    if (existing) return conflict("A category with this name already exists in this OpCo");

    const category = await prisma.expenseCategory.create({
      data: {
        name: parsed.data.name,
        opCoId: targetOpCoId,
        isShared: parsed.data.isShared,
        requiresAttachment: parsed.data.requiresAttachment,
      },
    });

    return created(category);
  },
});
