import { signInAnonymously, User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where
} from "firebase/firestore";
import { auth, db } from "../firebase";

interface FivePartResponse {
  whatIsHappeningDevelopmentally: string;
  whatParentsMayNotice: string;
  whatIsNormalVariation: string;
  whatToDoAtHome: string;
  whenToSeekClinicalScreening: string;
}

interface TimelineEvent {
  type: "observation" | "dailyCheckin" | "homeScreening" | "credential";
  createdAt: string;
  payload: Record<string, unknown>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function workerBaseUrl(): string {
  const value = import.meta.env.VITE_WORKER_BASE_URL;
  if (!value || typeof value !== "string") {
    throw new Error("Missing VITE_WORKER_BASE_URL");
  }
  return value.replace(/\/$/, "");
}

export async function ensureAuthenticated(): Promise<User> {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  const credential = await signInAnonymously(auth);
  return credential.user;
}

export async function getCurrentUid(): Promise<string> {
  const user = await ensureAuthenticated();
  return user.uid;
}

async function callWorker(path: string, payload: Record<string, unknown>) {
  const user = await ensureAuthenticated();
  const token = await user.getIdToken();

  const res = await fetch(`${workerBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(data.error ?? "Worker request failed"));
  }

  return data;
}

async function getChildProfile(childId: string, uid: string): Promise<Record<string, unknown>> {
  const childDoc = await getDoc(doc(db, "children", childId));
  if (!childDoc.exists()) {
    throw new Error("Child profile not found");
  }

  const child = childDoc.data() as Record<string, unknown>;
  if (child.parentId !== uid) {
    throw new Error("Child access denied");
  }

  return child;
}

async function buildMilestoneContext(ageMonths: number, domain?: string): Promise<string> {
  const milestoneQuery =
    domain && domain.trim().length > 0
      ? query(collection(db, "milestones"), where("domain", "==", domain), limit(30))
      : query(collection(db, "milestones"), limit(30));

  const snap = await getDocs(milestoneQuery);
  const titles = snap.docs
    .map((d) => d.data() as Record<string, unknown>)
    .filter((row) => {
      const min = Number(row.age_min_months ?? 0);
      const max = Number(row.age_max_months ?? 999);
      return ageMonths >= min && ageMonths <= max;
    })
    .map((row) => String(row.milestone_title ?? ""))
    .filter(Boolean)
    .slice(0, 6);

  return titles.join(", ");
}

export async function createChildProfile(payload: {
  childName: string;
  ageMonths: number;
}) {
  const user = await ensureAuthenticated();
  const childId = user.uid;

  await setDoc(
    doc(db, "children", childId),
    {
      parentId: user.uid,
      name: payload.childName.trim(),
      ageMonths: Number(payload.ageMonths),
      developmentSummary: {},
      createdAt: nowIso(),
      updatedAt: nowIso()
    },
    { merge: true }
  );

  await setDoc(
    doc(db, "users", user.uid),
    {
      hasChildProfile: true,
      updatedAt: nowIso()
    },
    { merge: true }
  );

  return { success: true, childId };
}

export async function askQuestion(payload: {
  childId: string;
  question: string;
  domain?: string;
}) {
  const user = await ensureAuthenticated();
  const child = await getChildProfile(payload.childId, user.uid);
  const milestoneContext = await buildMilestoneContext(Number(child.ageMonths ?? 0), payload.domain);

  const ai = (await callWorker("/v1/ask", {
    question: payload.question,
    milestoneContext
  })) as {
    response: FivePartResponse;
    provider: string;
  };

  await addDoc(collection(db, "observations"), {
    parentId: user.uid,
    childId: payload.childId,
    question: payload.question,
    aiResponse: ai.response,
    provider: ai.provider,
    createdAt: nowIso(),
    source: "worker.ask"
  });

  return ai.response;
}

export async function interpretCheckin(payload: {
  childId: string;
  summary: string;
  domain?: string;
}) {
  const user = await ensureAuthenticated();
  const child = await getChildProfile(payload.childId, user.uid);
  const milestoneContext = await buildMilestoneContext(Number(child.ageMonths ?? 0), payload.domain);

  const ai = (await callWorker("/v1/checkin", {
    summary: payload.summary,
    milestoneContext
  })) as {
    response: FivePartResponse;
    provider: string;
  };

  await addDoc(collection(db, "dailyCheckins"), {
    parentId: user.uid,
    childId: payload.childId,
    summary: payload.summary,
    interpretation: ai.response,
    provider: ai.provider,
    createdAt: nowIso()
  });

  return ai.response;
}

export async function saveHomeScreening(payload: {
  childId: string;
  domain: string;
  notes: string;
  resultCategory: "on_track" | "observe" | "screening_recommended";
}) {
  const user = await ensureAuthenticated();
  await getChildProfile(payload.childId, user.uid);

  const created = await addDoc(collection(db, "homeScreenings"), {
    parentId: user.uid,
    childId: payload.childId,
    domain: payload.domain,
    notes: payload.notes,
    resultCategory: payload.resultCategory,
    createdAt: nowIso()
  });

  return {
    success: true,
    screeningId: created.id
  };
}

export async function exportParentProfileSnapshot(childId: string) {
  const user = await ensureAuthenticated();
  const child = await getChildProfile(childId, user.uid);

  const [observationsSnap, screeningsSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, "observations"),
        where("parentId", "==", user.uid),
        where("childId", "==", childId),
        orderBy("createdAt", "desc"),
        limit(25)
      )
    ),
    getDocs(
      query(
        collection(db, "homeScreenings"),
        where("parentId", "==", user.uid),
        where("childId", "==", childId),
        orderBy("createdAt", "desc"),
        limit(25)
      )
    )
  ]);

  return {
    success: true,
    payload: {
      childId,
      ageMonths: Number(child.ageMonths ?? 0),
      developmentSummary: child.developmentSummary ?? {},
      recentObservations: observationsSnap.docs.map((d) => d.data()),
      homeScreeningHistory: screeningsSnap.docs.map((d) => d.data())
    }
  };
}

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}

export async function importScreeningCredential(payload: {
  childId: string;
  credential: Record<string, unknown>;
}) {
  const user = await ensureAuthenticated();
  await getChildProfile(payload.childId, user.uid);

  const required = ["credentialType", "assessmentDate", "clinicId", "version"];
  const missing = required.filter((k) => !payload.credential[k]);

  if (missing.length > 0) {
    return {
      success: false,
      errors: missing.map((field) => ({ field, message: "required" }))
    };
  }

  const serialized = JSON.stringify(payload.credential);
  const schemaHash = await sha256Hex(serialized);

  await addDoc(collection(db, "screeningCredentials"), {
    parentId: user.uid,
    childId: payload.childId,
    ...payload.credential,
    schemaHash,
    issuerId: String(payload.credential.clinicId ?? "unknown"),
    timestamp: nowIso(),
    importedAt: nowIso()
  });

  return {
    success: true,
    schemaHash
  };
}

export async function getDevelopmentTimeline(payload: { childId: string; limit?: number }) {
  const user = await ensureAuthenticated();
  await getChildProfile(payload.childId, user.uid);
  const size = Math.max(1, Math.min(50, Number(payload.limit ?? 20)));

  const [observations, checkins, screenings, credentials] = await Promise.all([
    getDocs(
      query(
        collection(db, "observations"),
        where("parentId", "==", user.uid),
        where("childId", "==", payload.childId),
        orderBy("createdAt", "desc"),
        limit(size)
      )
    ),
    getDocs(
      query(
        collection(db, "dailyCheckins"),
        where("parentId", "==", user.uid),
        where("childId", "==", payload.childId),
        orderBy("createdAt", "desc"),
        limit(size)
      )
    ),
    getDocs(
      query(
        collection(db, "homeScreenings"),
        where("parentId", "==", user.uid),
        where("childId", "==", payload.childId),
        orderBy("createdAt", "desc"),
        limit(size)
      )
    ),
    getDocs(
      query(
        collection(db, "screeningCredentials"),
        where("parentId", "==", user.uid),
        where("childId", "==", payload.childId),
        orderBy("timestamp", "desc"),
        limit(size)
      )
    )
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
    .slice(0, size);

  return { childId: payload.childId, timeline };
}
