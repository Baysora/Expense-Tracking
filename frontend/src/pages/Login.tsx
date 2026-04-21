import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { DEV_MODE, setDevCredentials, setDevUser } from "@/lib/auth";
import { getRoleHome } from "@/lib/router";
import { msalInstance, loginRequest } from "@/lib/auth";
import { Role } from "@expense/shared";
import { Loader2 } from "lucide-react";

export function Login() {
  const { user, setDevUser: setContextUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect
  if (user) {
    navigate(getRoleHome(user.role), { replace: true });
    return null;
  }

  async function handleDevLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const encoded = btoa(`${email}:${password}`);
      const authHeader = `Bearer dev:${encoded}`;

      const meRes = await fetch("/api/me", { headers: { Authorization: authHeader } });
      if (!meRes.ok) {
        setError("Invalid email or password");
        return;
      }

      const claims = await meRes.json();
      setDevCredentials({ email, password });
      setDevUser(claims);
      setContextUser(claims);
      navigate(getRoleHome(claims.role as Role), { replace: true });
    } catch {
      setError("Connection failed. Ensure the API is running.");
    } finally {
      setLoading(false);
    }
  }

  async function handleB2CLogin() {
    setLoading(true);
    try {
      await msalInstance.loginRedirect(loginRequest);
    } catch {
      setError("Login failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ backgroundColor: "var(--color-sidebar)" }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/logo-white.png" alt="Baysora" className="mx-auto mb-5 h-9 w-auto" />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>Expense Management</p>
        </div>

        <div className="card">
          {DEV_MODE ? (
            <form onSubmit={handleDevLogin} className="space-y-4">
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@holdco.com"
                />
              </div>
              <div>
                <label className="label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Admin@123!"
                />
              </div>
              {error && (
                <p className="text-sm font-medium" style={{ color: "var(--color-danger)" }}>
                  {error}
                </p>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
              </button>
              <p className="text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
                Development mode
              </p>
            </form>
          ) : (
            <div className="space-y-4">
              {error && (
                <p className="text-sm font-medium" style={{ color: "var(--color-danger)" }}>
                  {error}
                </p>
              )}
              <button onClick={handleB2CLogin} disabled={loading} className="btn-primary w-full">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Sign in with Microsoft"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
