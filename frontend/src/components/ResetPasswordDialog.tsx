import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "@/lib/api";
import { Loader2, X } from "lucide-react";

interface Props {
  userId: string;
  userName: string;
  onClose: () => void;
}

export function ResetPasswordDialog({ userId, userName, onClose }: Props) {
  const qc = useQueryClient();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reset = useMutation({
    mutationFn: () => userApi.update(userId, { newPassword }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setDone(true);
    },
    onError: (e: Error) => setError(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match");
      return;
    }
    reset.mutate();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "white", borderRadius: 16, padding: "28px 32px", width: "100%", maxWidth: 440, boxShadow: "0 4px 24px rgba(0,0,0,0.2)" }}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, margin: 0, color: "var(--color-text)" }}>
            Reset password
          </h2>
          <button type="button" onClick={onClose} className="p-1" aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)" }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <>
            <p className="text-sm" style={{ color: "var(--color-text)" }}>
              Password reset for <strong>{userName}</strong>.
            </p>
            <p className="text-sm mt-3" style={{ color: "var(--color-text-muted)" }}>
              Share the new password with the user securely. They will be required to change it on next login.
            </p>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={onClose} className="btn-primary">Done</button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p className="text-sm" style={{ color: "var(--color-text-muted)", margin: 0 }}>
              Set a new temporary password for <strong style={{ color: "var(--color-text)" }}>{userName}</strong>. They&apos;ll be required to change it on next login.
            </p>
            <div>
              <label className="label" htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
                autoFocus
              />
            </div>
            <div>
              <label className="label" htmlFor="confirm-password">Confirm password</label>
              <input
                id="confirm-password"
                type="password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                placeholder="Re-enter password"
              />
            </div>
            {error && (
              <p className="text-sm" style={{ color: "var(--color-danger)", margin: 0 }}>{error}</p>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={reset.isPending} className="btn-primary">
                {reset.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
