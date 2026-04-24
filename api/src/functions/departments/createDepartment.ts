import { app, HttpRequest } from "@azure/functions";
import { z } from "zod";
import { Role } from "../../shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { created, unauthorized, forbidden, badRequest, conflict } from "../../lib/errors";

const schema = z.object({
  name: z.string().min(1).max(100),
  opCoId: z.string().min(1),
});

app.http("createDepartment", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "departments",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.HOLDCO_ADMIN)) return forbidden();

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const existing = await prisma.department.findFirst({
      where: { opCoId: parsed.data.opCoId, name: parsed.data.name },
    });
    if (existing) return conflict("A department with this name already exists in this OpCo");

    const department = await prisma.department.create({
      data: {
        name: parsed.data.name,
        opCoId: parsed.data.opCoId,
      },
    });

    return created(department);
  },
});
