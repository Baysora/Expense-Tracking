import { app, HttpRequest } from "@azure/functions";
import { Role } from "@expense/shared";
import { verifyToken, requireRoles } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { BlobServiceClient } from "@azure/storage-blob";
import archiver from "archiver";
import { unauthorized, forbidden, badRequest } from "../../lib/errors";
import { PassThrough, Readable } from "stream";

const CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING ?? "";
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME ?? "expense-attachments";

function toCSVRow(values: (string | number | null | undefined)[]): string {
  return values
    .map((v) => {
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    })
    .join(",");
}

app.http("exportExpenses", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "exports/expenses",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    if (!requireRoles(claims, Role.HOLDCO_ADMIN, Role.OPCO_ADMIN, Role.OPCO_MANAGER)) return forbidden();

    const url = new URL(req.url);
    const rawFormat = url.searchParams.get("format") ?? "csv";
    if (rawFormat !== "csv" && rawFormat !== "zip") return badRequest("format must be csv or zip");
    const format = rawFormat as "csv" | "zip";
    const statusFilter = url.searchParams.get("status") ?? undefined;
    const userIdFilter = url.searchParams.get("userId") ?? undefined;
    const startDate = url.searchParams.get("startDate") ?? undefined;
    const endDate = url.searchParams.get("endDate") ?? undefined;
    const opCoIdParam = url.searchParams.get("opCoId") ?? undefined;

    // Build where clause respecting role
    const where: Record<string, unknown> = {};
    if (claims.role === Role.HOLDCO_ADMIN) {
      if (opCoIdParam) where.opCoId = opCoIdParam;
    } else {
      if (!claims.opCoId) return forbidden("No OpCo associated with this account");
      where.opCoId = claims.opCoId;
    }
    if (statusFilter) where.status = statusFilter;
    if (userIdFilter) where.submittedById = userIdFilter;
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: { select: { name: true } },
        submittedBy: { select: { name: true, email: true } },
        opCo: { select: { name: true } },
        attachments: true,
        approvalRecords: {
          include: { reviewedBy: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    const csvHeader = toCSVRow([
      "ID", "Title", "Amount", "Currency", "Status",
      "Category", "OpCo", "Submitted By", "Email",
      "Created", "Updated", "Reviewer", "Action", "Comment", "Attachment Count",
    ]);

    const csvRows = expenses.map((e) => {
      const approval = e.approvalRecords[0];
      return toCSVRow([
        e.id, e.title, Number(e.amount), e.currency, e.status,
        e.category.name, e.opCo.name, e.submittedBy.name, e.submittedBy.email,
        e.createdAt.toISOString(), e.updatedAt.toISOString(),
        approval?.reviewedBy.name ?? "",
        approval?.action ?? "",
        approval?.comment ?? "",
        e.attachments.length,
      ]);
    });

    const csvContent = [csvHeader, ...csvRows].join("\n");

    if (format === "csv") {
      return {
        status: 200,
        body: csvContent,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="expenses-${dateStr}.csv"`,
        },
      };
    }

    // ZIP format — include CSV + all attachment blobs
    const archive = archiver("zip", { zlib: { level: 6 } });
    const passthrough = new PassThrough();
    archive.pipe(passthrough);

    archive.append(csvContent, { name: "expenses.csv" });

    if (CONNECTION_STRING) {
      const blobServiceClient = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
      const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

      for (const expense of expenses) {
        for (const attachment of expense.attachments) {
          try {
            const blobClient = containerClient.getBlobClient(attachment.blobName);
            const downloadResponse = await blobClient.download();
            if (downloadResponse.readableStreamBody) {
              // The SDK may return a Web ReadableStream or a Node.js Readable depending on runtime
              const body = downloadResponse.readableStreamBody as unknown;
              const nodeStream = body instanceof Readable ? body : Readable.from(body as AsyncIterable<Uint8Array>);
              archive.append(nodeStream, {
                name: `attachments/${expense.id}/${attachment.fileName}`,
              });
            }
          } catch {
            // Skip blobs that can't be fetched (e.g. not yet uploaded locally)
          }
        }
      }
    }

    await archive.finalize();

    // Collect the ZIP buffer
    const chunks: Buffer[] = [];
    for await (const chunk of passthrough) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer));
    }
    const zipBuffer = Buffer.concat(chunks);

    return {
      status: 200,
      body: zipBuffer,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="expenses-${dateStr}.zip"`,
      },
    };
  },
});
