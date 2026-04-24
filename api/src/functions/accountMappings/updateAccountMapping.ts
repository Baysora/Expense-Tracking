import { app, HttpRequest } from "@azure/functions";
import { z } from "zod";
import { Role } from "../../shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ok, unauthorized, forbidden, badRequest, notFound } from "../../lib/errors";

const schema = z.object({
  accountName: z.string().min(1).max(200),
});

app.http("updateAccountMapping", {
  methods: ["PATCH"],
  authLevel: "anonymous",
  route: "account-mappings/{id}",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.HOLDCO_ADMIN)) return forbidden();

    const id = req.params.id;
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const existing = await prisma.accountMapping.findUnique({ where: { id } });
    if (!existing) return notFound("Mapping not found");

    const updated = await prisma.accountMapping.update({
      where: { id },
      data: { accountName: parsed.data.accountName.trim() },
    });

    return ok(updated);
  },
});
