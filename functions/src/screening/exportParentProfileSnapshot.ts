import { getFirestore } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import { loadOwnedChild } from "../utils/childAccess";
import { assertAuthenticated, assertString } from "../utils/errors";
import { validateParentProfileExport } from "./schemaValidators";

export interface ExportPayload {
  childId: string;
}

export async function handleExportParentProfileSnapshot(uid: string, input: ExportPayload) {
  const childId = assertString(input.childId, "childId");

  const db = getFirestore();
  const child = await loadOwnedChild(uid, childId);

  const [observationsSnap, screeningsSnap] = await Promise.all([
    db
      .collection("observations")
      .where("parentId", "==", uid)
      .where("childId", "==", childId)
      .orderBy("createdAt", "desc")
      .limit(25)
      .get(),
    db
      .collection("homeScreenings")
      .where("parentId", "==", uid)
      .where("childId", "==", childId)
      .orderBy("createdAt", "desc")
      .limit(25)
      .get()
  ]);

  const payload = {
    childId,
    ageMonths: Number(child.ageMonths ?? 0),
    developmentSummary: child.developmentSummary ?? {},
    recentObservations: observationsSnap.docs.map((d) => d.data()),
    homeScreeningHistory: screeningsSnap.docs.map((d) => d.data())
  };

  const valid = validateParentProfileExport(payload);
  if (!valid) {
    return {
      success: false,
      errors: validateParentProfileExport.errors ?? []
    };
  }

  return {
    success: true,
    payload
  };
}

export const exportParentProfileSnapshot = onCall(async (request) => {
  const uid = assertAuthenticated(request.auth?.uid);
  return handleExportParentProfileSnapshot(uid, request.data as ExportPayload);
});
