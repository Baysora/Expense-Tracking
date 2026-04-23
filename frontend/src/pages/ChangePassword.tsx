import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getRoleHome } from "@/lib/router";
import { authApi } from "@/lib/api";
import { Loader2 } from "lucide-react";

export function ChangePassword() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user && !user.mustChangePassword) {
    navigate(getRoleHome(user.role), { replace: true });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must differ from current password");
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      const fresh = await authApi.me();
      setUser(fresh);
      navigate(getRoleHome(fresh.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--color-bg)", padding: 24 }}>
      <div style={{ background: "white", borderRadius: 20, padding: "40px 44px", width: "100%", maxWidth: 400, boxShadow: "0 4px 24px rgba(26,35,50,0.1), 0 0 0 1px rgba(26,35,50,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "#f3a618", color: "#1c2631", fontWeight: 800, fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Serif Display', serif", flexShrink: 0 }}>
            B
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "var(--color-text)", letterSpacing: "-0.02em" }}>Baysora</span>
        </div>

        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, color: "var(--color-text)", margin: "0 0 6px" }}>
          Set a new password
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)", margin: "0 0 28px" }}>
          You must change your password before continuing.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="label" htmlFor="currentPassword">Current password</label>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              className="input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="label" htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="label" htmlFor="confirmPassword">Confirm new password</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Re-enter new password"
            />
          </div>

          {error && (
            <p className="text-sm font-medium" style={{ color: "var(--color-danger)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
            style={{ padding: "11px", fontSize: 14, marginTop: 4 }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
