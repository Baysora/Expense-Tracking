import { app, HttpRequest } from "@azure/functions";
import { Role } from "../../shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { getHoldCoOpCoId } from "../../lib/opco";
import { uploadBlob, isAllowedMimeType, isAllowedFileSize, generateSasUrl } from "../../lib/blob";
import { created, unauthorized, forbidden, badRequest, notFound } from "../../lib/errors";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

app.http("uploadAttachment", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "expenses/{expenseId}/attachments",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.HOLDCO_ADMIN, Role.HOLDCO_USER, Role.OPCO_USER, Role.OPCO_ADMIN, Role.OPCO_MANAGER)) return forbidden();

    // Resolve opCoId for HoldCo roles
    let opCoId = claims.opCoId;
    if (!opCoId) {
      if (claims.role === Role.HOLDCO_ADMIN || claims.role === Role.HOLDCO_USER) {
        opCoId = await getHoldCoOpCoId();
      } else {
        return forbidden("No OpCo associated with this account");
      }
    }

    const expenseId = req.params.expenseId;

    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        opCoId,
        submittedById: claims.userId,
        status: "DRAFT",
      },
    });
    if (!expense) return notFound("Expense not found or not in draft state");

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return badRequest("Expected multipart/form-data");
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return badRequest("Failed to parse form data");
    }

    const file = formData.get("file") as File | null;
    const attachmentType = formData.get("type") as string | null;

    if (!file) return badRequest("Missing file field");
    if (!attachmentType || !["RECEIPT", "INVOICE"].includes(attachmentType)) {
      return badRequest("type must be RECEIPT or INVOICE");
    }

    if (!isAllowedMimeType(file.type)) {
      return badRequest(
        "File type not allowed. Accepted: JPEG, PNG, WEBP, HEIC, HEIF, TIFF, GIF, BMP, PDF"
      );
    }
    if (!isAllowedFileSize(file.size)) {
      return badRequest("File size exceeds 10 MB limit");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let blobName: string;
    try {
      ({ blobName } = await uploadBlob(opCoId, expenseId, file.name, buffer, file.type));
    } catch {
      return { status: 500, body: JSON.stringify({ error: "Failed to upload file to storage" }), headers: { "Content-Type": "application/json" } };
    }

    const attachment = await prisma.expenseAttachment.create({
      data: {
        expenseId,
        type: attachmentType,
        fileName: file.name,
        blobName,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    });

    const sasUrl = await generateSasUrl(blobName);

    return created({ ...attachment, sasUrl });
  },
});
