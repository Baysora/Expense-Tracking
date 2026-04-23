import { app, HttpRequest } from "@azure/functions";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { verifyToken } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ok, unauthorized, badRequest } from "../../lib/errors";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

app.http("changePassword", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "auth/change-password",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const { currentPassword, newPassword } = parsed.data;

    if (currentPassword === newPassword) {
      return badRequest("New password must differ from current password");
    }

    const user = await prisma.user.findUnique({
      where: { id: claims.userId },
      select: { id: true, passwordHash: true, isActive: true },
    });
    if (!user || !user.isActive) return unauthorized();

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return unauthorized("Current password is incorrect");

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });

    return ok({ ok: true });
  },
});
