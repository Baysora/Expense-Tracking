import { app, HttpRequest } from "@azure/functions";
import { z } from "zod";
import { Role } from "@expense/shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ok, unauthorized, forbidden, badRequest, notFound } from "../../lib/errors";

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  requireAttachmentForAll: z.boolean().optional(),
  requireAttachmentAboveAmount: z.number().positive().nullable().optional(),
});

app.http("updateOpCo", {
  methods: ["PATCH"],
  authLevel: "anonymous",
  route: "opcos/{id}",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.HOLDCO_ADMIN)) return forbidden();

    const id = req.params.id;
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const opco = await prisma.opCo.findUnique({ where: { id } });
    if (!opco) return notFound("OpCo not found");

    const updated = await prisma.opCo.update({
      where: { id },
      data: parsed.data,
    });

    return ok(updated);
  },
});
