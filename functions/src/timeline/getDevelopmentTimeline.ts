import { getFirestore } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import { assertAuthenticated, assertString } from "../utils/errors";
import { loadOwnedChild } from "../utils/childAccess";

export interface TimelineInput {
  childId: string;
  limit?: number;
}

export interface TimelineEvent {
  type: "observation" | "dailyCheckin" | "homeScreening" | "credential";
  createdAt: string;
  payload: Record<string, unknown>;
}

export async function handleGetDevelopmentTimeline(uid: string, input: TimelineInput) {
  const childId = assertString(input.childId, "childId");
  const limit = Math.max(1, Math.min(50, Number(input.limit ?? 20)));

  await loadOwnedChild(uid, childId);
  const db = getFirestore();

  const [observations, checkins, screenings, credentials] = await Promise.all([
    db
      .collection("observations")
      .where("parentId", "==", uid)
      .where("childId", "==", childId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get(),
    db
      .collection("dailyCheckins")
      .where("parentId", "==", uid)
      .where("childId", "==", childId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get(),
    db
      .collection("homeScreenings")
      .where("parentId", "==", uid)
      .where("childId", "==", childId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get(),
    db
      .collection("screeningCredentials")
      .where("parentId", "==", uid)
      .where("childId", "==", childId)
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get()
  ]);

  const timeline: TimelineEvent[] = [
    ...observations.docs.map((d) => ({
      type: "observation" as const,
      createdAt: String(d.data().createdAt ?? ""),
      payload: d.data()
    })),
    ...checkins.docs.map((d) => ({
      type: "dailyCheckin" as const,
      createdAt: String(d.data().createdAt ?? ""),
      payload: d.data()
    })),
    ...screenings.docs.map((d) => ({
      type: "homeScreening" as const,
      createdAt: String(d.data().createdAt ?? ""),
      payload: d.data()
    })),
    ...credentials.docs.map((d) => ({
      type: "credential" as const,
      createdAt: String(d.data().timestamp ?? ""),
      payload: d.data()
    }))
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);

  return { childId, timeline };
}

export const getDevelopmentTimeline = onCall(async (request) => {
  const uid = assertAuthenticated(request.auth?.uid);
  return handleGetDevelopmentTimeline(uid, request.data as TimelineInput);
});
