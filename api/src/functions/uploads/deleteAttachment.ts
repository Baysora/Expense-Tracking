import { app, HttpRequest } from "@azure/functions";
import { Role } from "../../shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { deleteBlob } from "../../lib/blob";
import { ok, unauthorized, forbidden, notFound } from "../../lib/errors";

app.http("deleteAttachment", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "expenses/{expenseId}/attachments/{attachmentId}",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.HOLDCO_ADMIN, Role.HOLDCO_MANAGER, Role.HOLDCO_USER, Role.OPCO_USER, Role.OPCO_ADMIN, Role.OPCO_MANAGER)) return forbidden();

    const { expenseId, attachmentId } = req.params;

    const attachment = await prisma.expenseAttachment.findFirst({
      where: {
        id: attachmentId,
        expenseId,
        expense: {
          submittedById: claims.userId,
          status: "DRAFT",
        },
      },
    });

    if (!attachment) return notFound("Attachment not found");

    await deleteBlob(attachment.blobName);
    await prisma.expenseAttachment.delete({ where: { id: attachmentId } });

    return ok({ success: true });
  },
});
