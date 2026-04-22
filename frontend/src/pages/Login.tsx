import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { setToken } from "@/lib/auth";
import { getRoleHome } from "@/lib/router";
import { TokenClaims } from "@expense/shared";
import { Loader2 } from "lucide-react";

export function Login() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    navigate(getRoleHome(user.role), { replace: true });
    return null;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        setError("Invalid email or password");
        return;
      }

      const { token, user: claims } = (await res.json()) as { token: string; user: TokenClaims };
      setToken(token);
      setUser(claims);
      navigate(getRoleHome(claims.role), { replace: true });
    } catch {
      setError("Connection failed. Ensure the API is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--color-bg)", padding: 24 }}>
      <div style={{ background: "white", borderRadius: 20, padding: "40px 44px", width: "100%", maxWidth: 400, boxShadow: "0 4px 24px rgba(26,35,50,0.1), 0 0 0 1px rgba(26,35,50,0.06)" }}>
        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "#f3a618", color: "#1c2631", fontWeight: 800, fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Serif Display', serif", flexShrink: 0 }}>
            B
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "var(--color-text)", letterSpacing: "-0.02em" }}>Baysora</span>
        </div>

        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, color: "var(--color-text)", margin: "0 0 6px" }}>
          Welcome back
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)", margin: "0 0 28px" }}>
          Sign in to manage your expenses
        </p>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="label" htmlFor="email">Work email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@baysora.com"
            />
          </div>

          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <label className="label" htmlFor="password" style={{ margin: 0 }}>Password</label>
              <button
                type="button"
                style={{ background: "none", border: "none", fontSize: 12, color: "var(--color-primary)", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
              >
                Forgot password?
              </button>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
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
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
          </button>

          {/* OR divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
            <span style={{ fontSize: 12, color: "var(--color-text-placeholder)", fontWeight: 500 }}>or</span>
            <span style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
          </div>

          {/* Microsoft SSO */}
          <button
            type="button"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "white", border: "1.5px solid var(--color-border)", borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", color: "var(--color-text)" }}
          >
            <svg width="16" height="16" viewBox="0 0 21 21" fill="none">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Continue with Microsoft
          </button>
        </form>
      </div>

      <p style={{ marginTop: 24, fontSize: 12, color: "var(--color-text-placeholder)", textAlign: "center" }}>
        By signing in, you agree to Baysora's{" "}
        <a href="#" style={{ color: "var(--color-primary)" }}>Terms of Service</a>
      </p>
    </div>
  );
}
