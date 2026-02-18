import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { assertAuthenticated, assertString } from "../utils/errors";
import { loadOwnedChild } from "../utils/childAccess";
import { lookupMilestones } from "../utils/milestoneLookup";

export interface HomeScreeningInput {
  childId: string;
  domain: string;
  notes: string;
  resultCategory: "on_track" | "observe" | "screening_recommended";
}

export async function handleSaveHomeScreening(uid: string, input: HomeScreeningInput) {
  const childId = assertString(input.childId, "childId");
  const domain = assertString(input.domain, "domain");
  const notes = assertString(input.notes, "notes");
  const resultCategory = assertString(input.resultCategory, "resultCategory");

  if (!["on_track", "observe", "screening_recommended"].includes(resultCategory)) {
    throw new HttpsError("invalid-argument", "Invalid resultCategory");
  }

  const child = await loadOwnedChild(uid, childId);
  const milestoneContext = await lookupMilestones(child.ageMonths, domain);

  const doc = {
    parentId: uid,
    childId,
    domain,
    notes,
    resultCategory,
    milestoneContext: milestoneContext.map((m) => ({
      milestone_title: m.milestone_title,
      clinic_trigger: m.clinic_trigger
    })),
    createdAt: new Date().toISOString()
  };

  const created = await getFirestore().collection("homeScreenings").add(doc);

  return {
    success: true,
    screeningId: created.id
  };
}

export const saveHomeScreening = onCall(async (request) => {
  const uid = assertAuthenticated(request.auth?.uid);
  return handleSaveHomeScreening(uid, request.data as HomeScreeningInput);
});
