import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

export interface ChildRecord {
  parentId: string;
  ageMonths: number;
  name?: string;
  developmentSummary?: Record<string, unknown>;
}

export async function loadOwnedChild(uid: string, childId: string): Promise<ChildRecord> {
  const childDoc = await getFirestore().collection("children").doc(childId).get();

  if (!childDoc.exists) {
    throw new HttpsError("not-found", "Child profile not found");
  }

  const child = childDoc.data() as ChildRecord;
  if (child.parentId !== uid) {
    throw new HttpsError("permission-denied", "Child access denied");
  }

  return child;
}
