import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { assertAuthenticated, assertString } from "../utils/errors";
import { getAiResponse } from "../utils/aiProvider";
import { loadOwnedChild } from "../utils/childAccess";
import { enforceMedicalSafety } from "../utils/medicalSafety";
import { lookupMilestones } from "../utils/milestoneLookup";
import { formatFivePartResponse } from "../utils/responseFormatter";

export interface AskQuestionInput {
  childId: string;
  question: string;
  domain?: string;
}

export async function handleAskQuestion(uid: string, input: AskQuestionInput) {
  const childId = assertString(input.childId, "childId");
  const question = assertString(input.question, "question");
  enforceMedicalSafety(question);

  const db = getFirestore();
  const child = await loadOwnedChild(uid, childId);
  const ageMonths = Number(child.ageMonths ?? 0);
  const milestones = await lookupMilestones(ageMonths, input.domain);
  const milestoneContext = milestones.map((m) => m.milestone_title).join(", ");

  let ai;
  try {
    ai = await getAiResponse(question, milestoneContext);
  } catch {
    throw new HttpsError("internal", "AI response unavailable");
  }
  const structured = formatFivePartResponse(ai);

  await db.collection("observations").add({
    parentId: uid,
    childId,
    question,
    aiResponse: structured,
    createdAt: new Date().toISOString(),
    source: "askQuestion"
  });

  return structured;
}

export const askQuestion = onCall(async (request) => {
  const uid = assertAuthenticated(request.auth?.uid);
  return handleAskQuestion(uid, request.data as AskQuestionInput);
});
