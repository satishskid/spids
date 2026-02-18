import { getFirestore } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import { createHash } from "node:crypto";
import { loadOwnedChild } from "../utils/childAccess";
import { assertAuthenticated, assertObject, assertString } from "../utils/errors";
import { validateScreeningImport } from "./schemaValidators";

export interface ImportPayload {
  childId: string;
  credential: Record<string, unknown>;
}

export async function handleImportScreeningCredential(uid: string, input: ImportPayload) {
  const childId = assertString(input.childId, "childId");
  const credential = assertObject(input.credential, "credential");

  if (!validateScreeningImport(credential)) {
    return {
      success: false,
      errors: validateScreeningImport.errors ?? []
    };
  }

  const db = getFirestore();
  await loadOwnedChild(uid, childId);

  const serialized = JSON.stringify(credential);
  const schemaHash = createHash("sha256").update(serialized).digest("hex");

  const credentialDoc = {
    parentId: uid,
    childId,
    ...credential,
    schemaHash,
    issuerId: (credential["clinicId"] as string) ?? "unknown",
    timestamp: new Date().toISOString(),
    importedAt: new Date().toISOString()
  };

  await db.collection("screeningCredentials").add(credentialDoc);

  return {
    success: true,
    schemaHash
  };
}

export const importScreeningCredential = onCall(async (request) => {
  const uid = assertAuthenticated(request.auth?.uid);
  return handleImportScreeningCredential(uid, request.data as ImportPayload);
});
