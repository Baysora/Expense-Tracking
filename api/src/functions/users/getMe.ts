import { app, HttpRequest } from "@azure/functions";
import { verifyToken } from "../../lib/auth";
import { ok, unauthorized } from "../../lib/errors";

app.http("getMe", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "me",
  handler: async (req: HttpRequest) => {
    const claims = await verifyToken(req);
    if (!claims) return unauthorized();
    return ok(claims);
  },
});
