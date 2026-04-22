import { app, HttpRequest } from "@azure/functions";
import { z } from "zod";
import { Role } from "../../shared";
import bcrypt from "bcryptjs";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ok, unauthorized, forbidden, badRequest, notFound } from "../../lib/errors";

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  opCoId: z.string().nullable().optional(),
  newPassword: z.string().min(8).optional(),
});

app.http("updateUser", {
  methods: ["PATCH"],
  authLevel: "anonymous",
  route: "users/{id}",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.HOLDCO_ADMIN, Role.OPCO_ADMIN)) return forbidden();

    const id = req.params.id;
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return notFound("User not found");

    // OPCO_ADMIN can only update users in their own OpCo
    if (claims.role === Role.OPCO_ADMIN && user.opCoId !== claims.opCoId) {
      return forbidden("You can only manage users in your own OpCo");
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;
    if (claims.role === Role.HOLDCO_ADMIN && parsed.data.opCoId !== undefined) {
      updateData.opCoId = parsed.data.opCoId;
    }
    if (parsed.data.newPassword) {
      updateData.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, opCoId: true, isActive: true, createdAt: true },
    });

    return ok(updated);
  },
});
