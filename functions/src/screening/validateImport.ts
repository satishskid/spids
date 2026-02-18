import { onCall } from "firebase-functions/v2/https";
import { assertAuthenticated } from "../utils/errors";
import { validateScreeningImport } from "./schemaValidators";

export const validateImport = onCall(async (request) => {
  assertAuthenticated(request.auth?.uid);
  const payload = request.data;
  const valid = validateScreeningImport(payload);

  if (!valid) {
    return {
      valid: false,
      errors: validateScreeningImport.errors ?? []
    };
  }

  return { valid: true };
});
