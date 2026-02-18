import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { assertAuthenticated, assertString } from "../utils/errors";

export interface CreateChildProfileInput {
  childName: string;
  ageMonths: number;
}

export async function handleCreateChildProfile(uid: string, input: CreateChildProfileInput) {
  const childName = assertString(input.childName, "childName");
  const ageMonths = Number(input.ageMonths);

  if (!Number.isFinite(ageMonths) || ageMonths < 0 || ageMonths > 216) {
    throw new HttpsError("invalid-argument", "Invalid ageMonths");
  }

  const db = getFirestore();
  const childId = uid;

  await db.collection("children").doc(childId).set(
    {
      parentId: uid,
      name: childName,
      ageMonths,
      developmentSummary: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );

  await db.collection("users").doc(uid).set(
    {
      hasChildProfile: true,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );

  return {
    success: true,
    childId
  };
}

export const createChildProfile = onCall(async (request) => {
  const uid = assertAuthenticated(request.auth?.uid);
  return handleCreateChildProfile(uid, request.data as CreateChildProfileInput);
});
