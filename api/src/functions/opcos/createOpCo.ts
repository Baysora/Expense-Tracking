import { app, HttpRequest } from "@azure/functions";
import { z } from "zod";
import { Role } from "@expense/shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ok, created, unauthorized, forbidden, badRequest, conflict } from "../../lib/errors";

const schema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
});

app.http("createOpCo", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "opcos",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.HOLDCO_ADMIN)) return forbidden();

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const existing = await prisma.opCo.findUnique({ where: { slug: parsed.data.slug } });
    if (existing) return conflict("An OpCo with this slug already exists");

    const opco = await prisma.opCo.create({ data: parsed.data });
    return created(opco);
  },
});
