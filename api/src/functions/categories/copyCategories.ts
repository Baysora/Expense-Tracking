import { app, HttpRequest } from "@azure/functions";
import { z } from "zod";
import { Role } from "@expense/shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { getHoldCoOpCoId } from "../../lib/opco";
import { ok, unauthorized, forbidden, badRequest } from "../../lib/errors";

const schema = z.object({
  sourceOpCoId: z.string().min(1),
  targetOpCoIds: z.union([z.array(z.string().min(1)), z.literal("all")]),
});

app.http("copyCategories", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "categories/copy",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.HOLDCO_ADMIN)) return forbidden();

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const holdCoOpCoId = await getHoldCoOpCoId();

    // Resolve target OpCo IDs
    let targetOpCoIds: string[];
    if (parsed.data.targetOpCoIds === "all") {
      const opcos = await prisma.opCo.findMany({
        where: { isActive: true, id: { not: parsed.data.sourceOpCoId } },
        select: { id: true },
      });
      targetOpCoIds = opcos.map((o) => o.id);
    } else {
      targetOpCoIds = parsed.data.targetOpCoIds.filter(
        (id) => id !== parsed.data.sourceOpCoId
      );
    }

    if (targetOpCoIds.length === 0) {
      return badRequest("No valid target OpCos specified");
    }

    // Fetch active source categories (include shared categories if source is HoldCo)
    const sourceCategories = await prisma.expenseCategory.findMany({
      where: {
        isActive: true,
        OR: [
          { opCoId: parsed.data.sourceOpCoId },
          { isShared: true, opCoId: holdCoOpCoId },
        ],
      },
    });

    if (sourceCategories.length === 0) {
      return badRequest("Source OpCo has no active categories to copy");
    }

    let totalCopied = 0;
    let totalSkipped = 0;

    for (const targetOpCoId of targetOpCoIds) {
      // Get existing category names in target
      const existing = await prisma.expenseCategory.findMany({
        where: { opCoId: targetOpCoId },
        select: { name: true },
      });
      const existingNames = new Set(existing.map((c) => c.name));

      const toCreate = sourceCategories
        .filter((c) => !existingNames.has(c.name))
        .map((c) => ({
          name: c.name,
          opCoId: targetOpCoId,
          isActive: true,
          isShared: false, // copied categories are OpCo-specific
          requiresAttachment: c.requiresAttachment,
        }));

      totalSkipped += sourceCategories.length - toCreate.length;

      if (toCreate.length > 0) {
        await prisma.expenseCategory.createMany({ data: toCreate });
        totalCopied += toCreate.length;
      }
    }

    return ok({
      copied: totalCopied,
      skipped: totalSkipped,
      targets: targetOpCoIds.length,
    });
  },
});
