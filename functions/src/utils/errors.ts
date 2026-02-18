import { HttpsError } from "firebase-functions/v2/https";

export function assertAuthenticated(uid?: string): string {
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  return uid;
}

export function assertString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpsError("invalid-argument", `Invalid ${field}`);
  }
  return value.trim();
}

export function assertObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HttpsError("invalid-argument", `Invalid ${field}`);
  }
  return value as Record<string, unknown>;
}
