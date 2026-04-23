import { app, HttpRequest } from "@azure/functions";
import { z } from "zod";
import { Role } from "../../shared";
import bcrypt from "bcryptjs";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { created, unauthorized, forbidden, badRequest, conflict } from "../../lib/errors";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.nativeEnum(Role),
  opCoId: z.string().optional().nullable(),
  temporaryPassword: z.string().min(8),
});

app.http("createUser", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "users",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.HOLDCO_ADMIN, Role.OPCO_ADMIN)) return forbidden();

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const { email, name, role, opCoId, temporaryPassword } = parsed.data;

    // OPCO_ADMIN can only create users within their own OpCo
    if (claims.role === Role.OPCO_ADMIN) {
      if (opCoId !== claims.opCoId) {
        return forbidden("You can only create users for your own OpCo");
      }
      // OPCO_ADMIN cannot create HOLDCO_ADMIN or other OPCO_ADMINs
      if (role === Role.HOLDCO_ADMIN) {
        return forbidden("Insufficient permissions to assign this role");
      }
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return conflict("A user with this email already exists");

    // Verify opCo exists if provided
    if (opCoId) {
      const opco = await prisma.opCo.findUnique({ where: { id: opCoId } });
      if (!opco) return badRequest("OpCo not found");
    }

    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const user = await prisma.user.create({
      data: { email, name, role, opCoId: opCoId ?? null, passwordHash, mustChangePassword: true },
      select: { id: true, email: true, name: true, role: true, opCoId: true, isActive: true, createdAt: true },
    });

    return created(user);
  },
});
