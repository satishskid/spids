import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { handleAskQuestion } from "../src/ai/askQuestion";
import { handleInterpretCheckin } from "../src/ai/interpretCheckin";
import { handleCreateChildProfile } from "../src/profile/createChildProfile";
import { handleExportParentProfileSnapshot } from "../src/screening/exportParentProfileSnapshot";
import { handleImportScreeningCredential } from "../src/screening/importScreeningCredential";
import { handleSaveHomeScreening } from "../src/screening/saveHomeScreening";
import { handleGetDevelopmentTimeline } from "../src/timeline/getDevelopmentTimeline";

const projectId = process.env.GCLOUD_PROJECT ?? "demo-skids-parent";

async function clearFirestore(): Promise<void> {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host) {
    throw new Error("FIRESTORE_EMULATOR_HOST is required for integration tests");
  }

  const response = await fetch(
    `http://${host}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    throw new Error(`Failed to clear emulator data: ${response.status}`);
  }
}

describe("callable flow integration", () => {
  beforeAll(async () => {
    if (getApps().length === 0) {
      initializeApp({ projectId });
    }
  });

  beforeEach(async () => {
    await clearFirestore();

    await getFirestore().collection("milestones").doc("motor_36").set({
      domain: "motor",
      age_min_months: 30,
      age_max_months: 48,
      milestone_title: "Balanced movement control",
      development_process: "Motor planning and bilateral coordination improve.",
      observable_signs: "Child navigates stairs with reduced support.",
      normal_variation: "Pace of confidence building varies by child.",
      home_actions: "Use play-based climbing and balance routines.",
      clinic_trigger: "Persistent asymmetry or repeated loss of balance over weeks."
    });
  });

  afterAll(async () => {
    await clearFirestore();
  });

  it("runs full parent journey from profile to timeline", async () => {
    const uid = "parentA";

    const created = await handleCreateChildProfile(uid, {
      childName: "Ari",
      ageMonths: 36
    });
    expect(created.success).toBe(true);
    expect(created.childId).toBe(uid);

    const ask = await handleAskQuestion(uid, {
      childId: uid,
      question: "How can I support motor development this month?",
      domain: "motor"
    });
    expect(ask.whatIsHappeningDevelopmentally.length).toBeGreaterThan(0);
    expect(ask.whatToDoAtHome.length).toBeGreaterThan(0);

    const checkin = await handleInterpretCheckin(uid, {
      childId: uid,
      summary: "Observed better balance during play this week.",
      domain: "motor"
    });
    expect(checkin.whatParentsMayNotice.length).toBeGreaterThan(0);

    const homeScreening = await handleSaveHomeScreening(uid, {
      childId: uid,
      domain: "motor",
      notes: "Completed guided movement observations.",
      resultCategory: "on_track"
    });
    expect(homeScreening.success).toBe(true);
    expect(homeScreening.screeningId.length).toBeGreaterThan(0);

    const exported = await handleExportParentProfileSnapshot(uid, { childId: uid });
    expect(exported.success).toBe(true);
    expect(exported.payload.childId).toBe(uid);
    expect(exported.payload.recentObservations.length).toBeGreaterThan(0);
    expect(exported.payload.homeScreeningHistory.length).toBeGreaterThan(0);

    const imported = await handleImportScreeningCredential(uid, {
      childId: uid,
      credential: {
        credentialType: "SKIDS_HEAD_TO_TOE",
        assessmentDate: "2026-02-18",
        clinicId: "clinic-01",
        version: "1.0",
        riskFlags: []
      }
    });
    expect(imported.success).toBe(true);
    expect(imported.schemaHash.length).toBeGreaterThan(10);

    const timeline = await handleGetDevelopmentTimeline(uid, {
      childId: uid,
      limit: 20
    });

    expect(timeline.timeline.length).toBeGreaterThan(0);
    expect(timeline.timeline.some((item) => item.type === "observation")).toBe(true);
    expect(timeline.timeline.some((item) => item.type === "dailyCheckin")).toBe(true);
    expect(timeline.timeline.some((item) => item.type === "homeScreening")).toBe(true);
    expect(timeline.timeline.some((item) => item.type === "credential")).toBe(true);
  });

  it("blocks cross-parent access to child data", async () => {
    await handleCreateChildProfile("parentA", {
      childName: "Ari",
      ageMonths: 36
    });

    await expect(
      handleExportParentProfileSnapshot("parentB", { childId: "parentA" })
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: "permission-denied" });
  });
});
