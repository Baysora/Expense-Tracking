/**
 * Local dev server — replaces `func start` when Azure Functions Core Tools
 * can't be installed. Intercepts app.http() registrations and serves them
 * via Express on the same port (7071) the frontend proxy expects.
 *
 * Usage: ts-node --transpile-only src/localServer.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import express from "express";
import type { Request as ExpressReq, Response as ExpressRes } from "express";

// Load local.settings.json into process.env — replicates what `func start` does.
// Must run before any handler modules are loaded (they read process.env at init time).
try {
  const raw = readFileSync(join(__dirname, "..", "local.settings.json"), "utf-8");
  const settings = JSON.parse(raw) as { Values?: Record<string, string> };
  if (settings.Values) {
    for (const [k, v] of Object.entries(settings.Values)) {
      if (!process.env[k]) process.env[k] = v;
    }
  }
} catch {
  // OK — continue with existing process.env
}

interface AzReg {
  name: string;
  methods: string[];
  route: string;
  handler: (req: unknown, ctx: unknown) => Promise<{
    status?: number;
    jsonBody?: unknown;
    body?: unknown;
    headers?: Record<string, string>;
  }>;
}

const registrations: AzReg[] = [];

// eslint-disable-next-line @typescript-eslint/no-require-imports
const azFuncs = require("@azure/functions");
azFuncs.app.http = (name: string, opts: AzReg) => {
  registrations.push({
    name,
    methods: opts.methods || ["GET"],
    route: opts.route,
    handler: opts.handler,
  });
};

// Trigger all handler registrations via the patched app.http()
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("./index");

const PORT = 7071;
const server = express();

// Capture raw body for all requests before any parsing
server.use((req: ExpressReq, _res: ExpressRes, next) => {
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    (req as ExpressReq & { rawBody: Buffer }).rawBody = Buffer.concat(chunks);
    next();
  });
  req.on("error", next);
});

// Convert Azure Functions route template {param} → Express :param
function toExpressPath(azRoute: string): string {
  return "/api/" + azRoute.replace(/\{(\w+)\}/g, ":$1");
}

// Build an object that satisfies the HttpRequest interface our handlers expect
function buildAzureReq(req: ExpressReq, params: Record<string, string>): unknown {
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  const fullUrl = `http://localhost:${PORT}${req.path}${qs ? "?" + qs : ""}`;

  const headers = new Headers();
  for (const [key, val] of Object.entries(req.headers)) {
    if (val) headers.set(key, Array.isArray(val) ? val[0] : val);
  }

  const rawBody: Buffer = (req as ExpressReq & { rawBody: Buffer }).rawBody ?? Buffer.alloc(0);
  const needsBody = !["GET", "HEAD"].includes(req.method.toUpperCase()) && rawBody.length > 0;

  const nativeReq = new Request(fullUrl, {
    method: req.method,
    headers,
    body: needsBody ? rawBody : undefined,
    // required in Node 18+ when providing a body
    // @ts-ignore
    duplex: "half",
  });

  // params is Azure Functions-specific (not on native Request)
  return Object.assign(nativeReq, { params });
}

// Register routes
for (const reg of registrations) {
  const expressPath = toExpressPath(reg.route);
  const methods = reg.methods.map((m) => m.toLowerCase());

  for (const method of methods) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (server as any)[method](expressPath, async (req: ExpressReq, res: ExpressRes) => {
      try {
        const azReq = buildAzureReq(req, req.params as Record<string, string>);
        const result = await reg.handler(azReq, {});

        const status = result?.status ?? 200;
        res.status(status);

        if (result?.headers) {
          for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
        }

        if (result?.jsonBody !== undefined) {
          res.json(result.jsonBody);
        } else if (result?.body) {
          res.send(result.body);
        } else {
          res.end();
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[${reg.name}] Error:`, msg);
        res.status(500).json({ error: "Internal server error" });
      }
    });
  }
}

server.listen(PORT, () => {
  console.log(`\nLocal Azure Functions dev server on http://localhost:${PORT}\n`);
  console.log("Functions:");
  for (const reg of registrations) {
    for (const method of reg.methods) {
      console.log(`  ${reg.name}: [${method}] http://localhost:${PORT}/api/${reg.route}`);
    }
  }
  console.log("");
});
