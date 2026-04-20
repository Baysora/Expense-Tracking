import React, { useRef, useState } from "react";
import { AttachmentType, ExpenseAttachment } from "@expense/shared";
import { attachmentApi } from "@/lib/api";
import { formatFileSize, getFileIcon, ACCEPTED_FILE_TYPES } from "@/lib/utils";
import { Upload, X, Loader2, ExternalLink } from "lucide-react";

interface AttachmentUploadProps {
  expenseId: string;
  attachments: (ExpenseAttachment & { sasUrl?: string })[];
  onChange: (attachments: (ExpenseAttachment & { sasUrl?: string })[]) => void;
}

export function AttachmentUpload({ expenseId, attachments, onChange }: AttachmentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(files: FileList | null, type: AttachmentType) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);

    try {
      const uploaded: (ExpenseAttachment & { sasUrl?: string })[] = [];
      for (const file of Array.from(files)) {
        const result = await attachmentApi.upload(expenseId, file, type);
        uploaded.push(result);
      }
      onChange([...attachments, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent, type: AttachmentType) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files, type);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(["RECEIPT", "INVOICE"] as AttachmentType[]).map((type) => (
          <div key={type}>
            <p className="label capitalize">{type.toLowerCase()}</p>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => handleDrop(e, type)}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors"
              style={{
                borderColor: dragOver ? "var(--color-primary)" : "var(--color-border)",
                backgroundColor: dragOver ? "rgba(30,58,95,0.04)" : "transparent",
              }}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            >
              <Upload className="mb-2 h-6 w-6" style={{ color: "var(--color-text-muted)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                {uploading ? "Uploading…" : "Drop file or tap to browse"}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                PDF, JPEG, PNG, HEIC, TIFF, GIF — up to 10 MB
              </p>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPTED_FILE_TYPES}
                className="hidden"
                onChange={(e) => handleFiles(e.target.files, type)}
              />
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}

      {uploading && (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
          <Loader2 className="h-4 w-4 animate-spin" />
          Uploading…
        </div>
      )}

      {attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
            Attached Files
          </p>
          {attachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg px-3 py-2"
              style={{ backgroundColor: "var(--color-bg-subtle)", border: "1px solid var(--color-border)" }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">{getFileIcon(a.mimeType)}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" style={{ color: "var(--color-text)" }}>
                    {a.fileName}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {a.type} · {formatFileSize(a.sizeBytes)}
                  </p>
                </div>
              </div>
              {a.sasUrl && (
                <a
                  href={a.sasUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 flex-shrink-0"
                  style={{ color: "var(--color-primary)" }}
                  aria-label={`View ${a.fileName}`}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
