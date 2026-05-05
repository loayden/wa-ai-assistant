// FILE: src/lib/api/request.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: JSON parsing is centralized so malformed request bodies are handled
 * as client errors before each route applies its Zod schema.
 */
import "server-only";

export class InvalidJsonError extends Error {
  constructor(message = "Invalid JSON request body.") {
    super(message);
    this.name = "InvalidJsonError";
  }
}

export async function readJsonRequestBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new InvalidJsonError();
  }
}
