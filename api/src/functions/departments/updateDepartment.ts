import { app, HttpRequest } from "@azure/functions";
import { z } from "zod";
import { Role } from "../../shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ok, unauthorized, forbidden, badRequest, notFound } from "../../lib/errors";

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DELETED"]).optional(),
});

app.http("updateDepartment", {
  methods: ["PATCH"],
  authLevel: "anonymous",
  route: "departments/{id}",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.HOLDCO_ADMIN)) return forbidden();

    const id = req.params.id;
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const department = await prisma.department.findUnique({ where: { id } });
    if (!department) return notFound("Department not found");

    const updated = await prisma.department.update({
      where: { id },
      data: parsed.data,
    });

    return ok(updated);
  },
});
