import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

export async function createChildProfile(payload: {
  childName: string;
  ageMonths: number;
}) {
  const fn = httpsCallable(functions, "createChildProfile");
  const result = await fn(payload);
  return result.data;
}

export async function askQuestion(payload: {
  childId: string;
  question: string;
  domain?: string;
}) {
  const fn = httpsCallable(functions, "askQuestion");
  const result = await fn(payload);
  return result.data;
}

export async function interpretCheckin(payload: {
  childId: string;
  summary: string;
  domain?: string;
}) {
  const fn = httpsCallable(functions, "interpretCheckin");
  const result = await fn(payload);
  return result.data;
}

export async function exportParentProfileSnapshot(childId: string) {
  const fn = httpsCallable(functions, "exportParentProfileSnapshot");
  const result = await fn({ childId });
  return result.data;
}

export async function importScreeningCredential(payload: {
  childId: string;
  credential: Record<string, unknown>;
}) {
  const fn = httpsCallable(functions, "importScreeningCredential");
  const result = await fn(payload);
  return result.data;
}

export async function saveHomeScreening(payload: {
  childId: string;
  domain: string;
  notes: string;
  resultCategory: "on_track" | "observe" | "screening_recommended";
}) {
  const fn = httpsCallable(functions, "saveHomeScreening");
  const result = await fn(payload);
  return result.data;
}

export async function getDevelopmentTimeline(payload: { childId: string; limit?: number }) {
  const fn = httpsCallable(functions, "getDevelopmentTimeline");
  const result = await fn(payload);
  return result.data;
}
