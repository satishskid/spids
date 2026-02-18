import { getFirestore } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import { loadOwnedChild } from "../utils/childAccess";
import { assertAuthenticated, assertString } from "../utils/errors";
import { enforceMedicalSafety } from "../utils/medicalSafety";
import { lookupMilestones } from "../utils/milestoneLookup";
import { formatFivePartResponse } from "../utils/responseFormatter";

export interface CheckinInput {
  childId: string;
  summary: string;
  domain?: string;
}

export async function handleInterpretCheckin(uid: string, input: CheckinInput) {
  const childId = assertString(input.childId, "childId");
  const summary = assertString(input.summary, "summary");
  enforceMedicalSafety(summary);

  const db = getFirestore();
  const child = await loadOwnedChild(uid, childId);
  const ageMonths = Number(child.ageMonths ?? 0);
  const milestones = await lookupMilestones(ageMonths, input.domain);
  const topMilestone = milestones[0];

  const structured = formatFivePartResponse({
    whatIsHappeningDevelopmentally:
      topMilestone?.development_process ??
      "Current observations suggest active developmental adaptation in this age range.",
    whatParentsMayNotice:
      topMilestone?.observable_signs ??
      "You may observe gradual progression rather than abrupt changes.",
    whatIsNormalVariation:
      topMilestone?.normal_variation ??
      "Variation in timing and intensity is expected.",
    whatToDoAtHome:
      topMilestone?.home_actions ??
      "Continue short daily activities and track changes consistently.",
    whenToSeekClinicalScreening:
      topMilestone?.clinic_trigger ??
      "Seek clinical screening if concerns persist across multiple weeks."
  });

  await db.collection("dailyCheckins").add({
    parentId: uid,
    childId,
    summary,
    interpretation: structured,
    createdAt: new Date().toISOString()
  });

  return structured;
}

export const interpretCheckin = onCall(async (request) => {
  const uid = assertAuthenticated(request.auth?.uid);
  return handleInterpretCheckin(uid, request.data as CheckinInput);
});
