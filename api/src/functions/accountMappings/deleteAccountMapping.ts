import { app, HttpRequest } from "@azure/functions";
import { Role } from "../../shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { unauthorized, forbidden, notFound } from "../../lib/errors";

app.http("deleteAccountMapping", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "account-mappings/{id}",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.HOLDCO_ADMIN)) return forbidden();

    const id = req.params.id;
    const existing = await prisma.accountMapping.findUnique({ where: { id } });
    if (!existing) return notFound("Mapping not found");

    await prisma.accountMapping.delete({ where: { id } });
    return { status: 204 };
  },
});
