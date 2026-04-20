import { HttpRequest, HttpResponseInit } from "@azure/functions";

export function badRequest(message: string): HttpResponseInit {
  return { status: 400, jsonBody: { error: message } };
}

export function unauthorized(message = "Unauthorized"): HttpResponseInit {
  return { status: 401, jsonBody: { error: message } };
}

export function forbidden(message = "Forbidden"): HttpResponseInit {
  return { status: 403, jsonBody: { error: message } };
}

export function notFound(message = "Not found"): HttpResponseInit {
  return { status: 404, jsonBody: { error: message } };
}

export function conflict(message: string): HttpResponseInit {
  return { status: 409, jsonBody: { error: message } };
}

export function internalError(message = "Internal server error"): HttpResponseInit {
  return { status: 500, jsonBody: { error: message } };
}

export function ok(data: unknown): HttpResponseInit {
  return { status: 200, jsonBody: data };
}

export function created(data: unknown): HttpResponseInit {
  return { status: 201, jsonBody: data };
}
