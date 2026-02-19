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
import { VERIFIED_MILESTONES } from "../data/verifiedMilestones";

export interface FivePartResponse {
  whatIsHappeningDevelopmentally: string;
  whatParentsMayNotice: string;
  whatIsNormalVariation: string;
  whatToDoAtHome: string;
  whenToSeekClinicalScreening: string;
}

export type UncertaintyLevel = "low" | "medium" | "high";

export interface AiCitation {
  title: string;
  url: string;
}

export interface AiUncertainty {
  level: UncertaintyLevel;
  reason: string;
}

export interface AiQuality {
  model: string;
  provider: string;
  fallbackUsed: boolean;
  parseMode: "json" | "fallback";
  promptVersion: string;
  latencyMs: number;
  hadConversationContext: boolean;
  hadMilestoneContext: boolean;
  hadParentContext: boolean;
}

export interface AiGuidancePacket {
  response: FivePartResponse;
  provider: string;
  citations: AiCitation[];
  uncertainty: AiUncertainty;
  quality: AiQuality;
}

export interface TimelineEvent {
  type: "observation" | "dailyCheckin" | "homeScreening" | "credential";
  createdAt: string;
  payload: Record<string, unknown>;
}

export interface BlogPost {
  title: string;
  link: string;
  publishedAt: string;
  excerpt: string;
  imageUrl: string;
  keywords: string[];
}

export interface ChildProfileSummary {
  childId: string;
  name: string;
  ageMonths: number;
  parentId: string;
}

export interface MilestoneWallItem {
  id: string;
  domain: string;
  ageMinMonths: number;
  ageMaxMonths: number;
  priority?: "major" | "minor";
  milestoneTitle: string;
  developmentProcess: string;
  biologyExplanation: string;
  observableSigns: string;
  normalVariation: string;
  homeActions: string;
  clinicTrigger: string;
  sourceAuthority?: string;
  sourceUrl?: string;
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

  try {
    const credential = await signInAnonymously(auth);
    return credential.user;
  } catch (error) {
    const authError = error as { code?: string; message?: string };
    if (authError.code === "auth/configuration-not-found") {
      throw new Error(
        "Authentication not configured. Enable Anonymous sign-in in Firebase Console -> Authentication -> Sign-in method."
      );
    }
    throw new Error(authError.message ?? "Authentication failed");
  }
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

export async function fetchDailyBlogs(search = ""): Promise<BlogPost[]> {
  const base = `${workerBaseUrl()}/v1/blogs`;
  const url =
    search.trim().length > 0
      ? `${base}?q=${encodeURIComponent(search.trim())}&limit=200`
      : `${base}?limit=200`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    items?: BlogPost[];
    total?: number;
    matched?: number;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(data.error ?? "Blog fetch failed");
  }

  return data.items ?? [];
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
  const normalizedDomain = normalizeDomain(domain ?? "");
  const authoritative = toVerifiedMilestoneRows()
    .filter((row) => {
      const domainMatches = normalizedDomain.length === 0 || normalizeDomain(row.domain) === normalizedDomain;
      return domainMatches && ageMonths >= row.ageMinMonths && ageMonths <= row.ageMaxMonths;
    })
    .map((row) => row.milestoneTitle);

  const firestoreQuery =
    normalizedDomain.length > 0
      ? query(collection(db, "milestones"), where("domain", "==", normalizedDomain), limit(30))
      : query(collection(db, "milestones"), limit(30));

  let customTitles: string[] = [];
  try {
    const snap = await getDocs(firestoreQuery);
    customTitles = snap.docs
      .map((d) => d.data() as Record<string, unknown>)
      .filter((row) => {
        const min = Number(row.age_min_months ?? row.ageMinMonths ?? 0);
        const max = Number(row.age_max_months ?? row.ageMaxMonths ?? 999);
        return ageMonths >= min && ageMonths <= max;
      })
      .map((row) => String(row.milestone_title ?? row.title ?? ""))
      .filter((title) => title.trim().length > 0);
  } catch {
    customTitles = [];
  }

  return Array.from(new Set([...authoritative, ...customTitles])).slice(0, 8).join(", ");
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

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase();
}

function midpointMonths(item: MilestoneWallItem): number {
  return (item.ageMinMonths + item.ageMaxMonths) / 2;
}

function toVerifiedMilestoneRows(): MilestoneWallItem[] {
  return VERIFIED_MILESTONES.map((row, index) => ({
    id: `verified-${index}`,
    domain: row.domain,
    ageMinMonths: row.ageMinMonths,
    ageMaxMonths: row.ageMaxMonths,
    priority: row.priority,
    milestoneTitle: row.milestoneTitle,
    developmentProcess: row.developmentProcess,
    biologyExplanation: "",
    observableSigns: row.observableSigns,
    normalVariation: "",
    homeActions: row.homeActions,
    clinicTrigger: row.clinicTrigger,
    sourceAuthority: row.sourceAuthority,
    sourceUrl: row.sourceUrl
  }));
}

export async function getChildProfileSummary(childId: string): Promise<ChildProfileSummary | null> {
  const user = await ensureAuthenticated();
  const child = await getDoc(doc(db, "children", childId));
  if (!child.exists()) {
    return null;
  }

  const data = child.data() as Record<string, unknown>;
  if (String(data.parentId ?? "") !== user.uid) {
    throw new Error("Child access denied");
  }

  return {
    childId,
    name: asText(data.name, ""),
    ageMonths: asNumber(data.ageMonths, 0),
    parentId: asText(data.parentId, "")
  };
}

export async function fetchMilestoneWall(payload: {
  ageMonths: number;
  domain?: string;
  limit?: number;
  spanMonths?: number;
}): Promise<MilestoneWallItem[]> {
  const targetAge = asNumber(payload.ageMonths, 0);
  const span = Math.max(3, Math.min(18, asNumber(payload.spanMonths, 9)));
  const maxRows = Math.max(20, Math.min(260, asNumber(payload.limit, 200)));
  const normalizedDomain = normalizeDomain(payload.domain ?? "");

  function readNumber(data: Record<string, unknown>, keys: string[], fallback = 0): number {
    for (const key of keys) {
      const value = asNumber(data[key], Number.NaN);
      if (Number.isFinite(value)) {
        return value;
      }
    }
    return fallback;
  }

  function readText(data: Record<string, unknown>, keys: string[], fallback = ""): string {
    for (const key of keys) {
      const value = asText(data[key], "");
      if (value.trim().length > 0) {
        return value.trim();
      }
    }
    return fallback;
  }

  const authoritativeRows = toVerifiedMilestoneRows();
  let firestoreRows: MilestoneWallItem[] = [];

  try {
    const snap = await getDocs(query(collection(db, "milestones"), limit(maxRows)));
    firestoreRows = snap.docs
      .map((row) => {
        const data = row.data() as Record<string, unknown>;
        const ageMin = readNumber(
          data,
          ["age_min_months", "ageMinMonths", "age_min", "min_age_months", "from_month", "start_month"],
          0
        );
        const rawAgeMax = readNumber(
          data,
          ["age_max_months", "ageMaxMonths", "age_max", "max_age_months", "to_month", "end_month"],
          ageMin + 1
        );
        const ageMax = rawAgeMax >= ageMin ? rawAgeMax : ageMin + 1;
        const title = readText(data, ["milestone_title", "title", "name", "milestone"], "");
        const domain = readText(data, ["domain", "domain_name", "category", "track", "stream"], "general");

        const priorityRaw = readText(
          data,
          ["priority", "importance", "level", "milestone_level", "marker_type"],
          ""
        ).toLowerCase();
        const explicitMajor =
          priorityRaw.includes("major") ||
          priorityRaw.includes("core") ||
          priorityRaw.includes("key") ||
          priorityRaw.includes("primary") ||
          data.isMajor === true ||
          asNumber(data.is_major, 0) === 1;
        const midpoint = (ageMin + ageMax) / 2;
        const inferredMajor = ageMax - ageMin >= 3 || Math.round(midpoint) % 3 === 0;
        const priority: "major" | "minor" = explicitMajor || inferredMajor ? "major" : "minor";

        return {
          id: row.id,
          domain,
          ageMinMonths: ageMin,
          ageMaxMonths: ageMax,
          priority,
          milestoneTitle: title,
          developmentProcess: readText(data, ["development_process", "developmentProcess", "process"], ""),
          biologyExplanation: readText(data, ["biology_explanation", "biologyExplanation"], ""),
          observableSigns: readText(data, ["observable_signs", "observableSigns", "signs"], ""),
          normalVariation: readText(data, ["normal_variation", "normalVariation"], ""),
          homeActions: readText(data, ["home_actions", "homeActions", "actions"], ""),
          clinicTrigger: readText(data, ["clinic_trigger", "clinicTrigger"], ""),
          sourceAuthority: readText(data, ["source_authority", "sourceAuthority"], ""),
          sourceUrl: readText(data, ["source_url", "sourceUrl"], "")
        } satisfies MilestoneWallItem;
      })
      .filter((row) => row.milestoneTitle.trim().length > 0);
  } catch {
    firestoreRows = [];
  }

  const scopedAuthoritative =
    normalizedDomain.length > 0
      ? authoritativeRows.filter((row) => normalizeDomain(row.domain) === normalizedDomain)
      : authoritativeRows;
  const scopedFirestore =
    normalizedDomain.length > 0
      ? firestoreRows.filter((row) => normalizeDomain(row.domain) === normalizedDomain)
      : firestoreRows;

  const byKey = new Map<string, MilestoneWallItem>();
  const addUnique = (rows: MilestoneWallItem[]) => {
    for (const row of rows) {
      const key = [
        normalizeDomain(row.domain),
        row.ageMinMonths,
        row.ageMaxMonths,
        row.milestoneTitle.toLowerCase().trim()
      ].join("|");
      if (!byKey.has(key)) {
        byKey.set(key, row);
      }
    }
  };

  // Authoritative baseline first, then any custom clinic-authored rows.
  addUnique(scopedAuthoritative);
  addUnique(
    scopedFirestore.filter(
      (row) =>
        row.sourceAuthority?.trim().length ||
        row.sourceUrl?.trim().length ||
        normalizeDomain(row.domain) === "clinic"
      )
  );

  if (byKey.size === 0) {
    addUnique(authoritativeRows);
  }

  const pool = Array.from(byKey.values());

  const withinAge = pool
    .filter((row) => row.ageMaxMonths >= targetAge - span && row.ageMinMonths <= targetAge + span)
    .sort((a, b) => {
      const aMid = midpointMonths(a);
      const bMid = midpointMonths(b);
      const aDistance = Math.abs(aMid - targetAge);
      const bDistance = Math.abs(bMid - targetAge);
      if (aDistance !== bDistance) {
        return aDistance - bDistance;
      }
      return a.ageMinMonths - b.ageMinMonths;
    });

  if (withinAge.length > 0) {
    return withinAge.slice(0, Math.min(maxRows, 120));
  }

  return pool
    .sort((a, b) => {
      const aMid = midpointMonths(a);
      const bMid = midpointMonths(b);
      const aDistance = Math.abs(aMid - targetAge);
      const bDistance = Math.abs(bMid - targetAge);
      if (aDistance !== bDistance) {
        return aDistance - bDistance;
      }
      return a.ageMinMonths - b.ageMinMonths;
    })
    .slice(0, Math.min(maxRows, 120));
}

export async function askQuestion(payload: {
  childId: string;
  question: string;
  domain?: string;
  conversationContext?: string;
  parentContext?: string;
}): Promise<AiGuidancePacket> {
  const user = await ensureAuthenticated();
  const child = await getChildProfile(payload.childId, user.uid);
  const milestoneContext = await buildMilestoneContext(Number(child.ageMonths ?? 0), payload.domain);

  const ai = (await callWorker("/v1/ask", {
    question: payload.question,
    milestoneContext,
    conversationContext: payload.conversationContext ?? "",
    parentContext: payload.parentContext ?? "",
    childAgeMonths: Number(child.ageMonths ?? 0),
    focusDomain: payload.domain ?? "general"
  })) as {
    response: FivePartResponse;
    provider: string;
    citations?: AiCitation[];
    uncertainty?: AiUncertainty;
    quality?: AiQuality;
  };

  const guidance: AiGuidancePacket = {
    response: ai.response,
    provider: ai.provider,
    citations: Array.isArray(ai.citations) ? ai.citations : [],
    uncertainty: ai.uncertainty ?? {
      level: "medium",
      reason: "Guidance confidence varies by input detail and developmental context."
    },
    quality: ai.quality ?? {
      model: ai.provider,
      provider: ai.provider,
      fallbackUsed: false,
      parseMode: "json",
      promptVersion: "unknown",
      latencyMs: 0,
      hadConversationContext: Boolean(payload.conversationContext?.trim()),
      hadMilestoneContext: Boolean(milestoneContext.trim()),
      hadParentContext: Boolean(payload.parentContext?.trim())
    }
  };

  await addDoc(collection(db, "observations"), {
    parentId: user.uid,
    childId: payload.childId,
    question: payload.question,
    aiResponse: guidance.response,
    provider: guidance.provider,
    uncertainty: guidance.uncertainty,
    citations: guidance.citations,
    aiQuality: guidance.quality,
    createdAt: nowIso(),
    source: "worker.ask"
  });

  await addDoc(collection(db, "aiQualityLogs"), {
    parentId: user.uid,
    childId: payload.childId,
    mode: "ask",
    provider: guidance.provider,
    model: guidance.quality.model,
    fallbackUsed: guidance.quality.fallbackUsed,
    parseMode: guidance.quality.parseMode,
    promptVersion: guidance.quality.promptVersion,
    latencyMs: guidance.quality.latencyMs,
    uncertaintyLevel: guidance.uncertainty.level,
    uncertaintyReason: guidance.uncertainty.reason,
    citationCount: guidance.citations.length,
    citations: guidance.citations,
    hadConversationContext: guidance.quality.hadConversationContext,
    hadMilestoneContext: guidance.quality.hadMilestoneContext,
    hadParentContext: guidance.quality.hadParentContext,
    createdAt: nowIso(),
    source: "worker.ask"
  });

  return guidance;
}

export async function interpretCheckin(payload: {
  childId: string;
  summary: string;
  domain?: string;
  conversationContext?: string;
  parentContext?: string;
}): Promise<AiGuidancePacket> {
  const user = await ensureAuthenticated();
  const child = await getChildProfile(payload.childId, user.uid);
  const milestoneContext = await buildMilestoneContext(Number(child.ageMonths ?? 0), payload.domain);

  const ai = (await callWorker("/v1/checkin", {
    summary: payload.summary,
    milestoneContext,
    conversationContext: payload.conversationContext ?? "",
    parentContext: payload.parentContext ?? "",
    childAgeMonths: Number(child.ageMonths ?? 0),
    focusDomain: payload.domain ?? "general"
  })) as {
    response: FivePartResponse;
    provider: string;
    citations?: AiCitation[];
    uncertainty?: AiUncertainty;
    quality?: AiQuality;
  };

  const guidance: AiGuidancePacket = {
    response: ai.response,
    provider: ai.provider,
    citations: Array.isArray(ai.citations) ? ai.citations : [],
    uncertainty: ai.uncertainty ?? {
      level: "medium",
      reason: "Guidance confidence varies by input detail and developmental context."
    },
    quality: ai.quality ?? {
      model: ai.provider,
      provider: ai.provider,
      fallbackUsed: false,
      parseMode: "json",
      promptVersion: "unknown",
      latencyMs: 0,
      hadConversationContext: Boolean(payload.conversationContext?.trim()),
      hadMilestoneContext: Boolean(milestoneContext.trim()),
      hadParentContext: Boolean(payload.parentContext?.trim())
    }
  };

  await addDoc(collection(db, "dailyCheckins"), {
    parentId: user.uid,
    childId: payload.childId,
    summary: payload.summary,
    interpretation: guidance.response,
    provider: guidance.provider,
    uncertainty: guidance.uncertainty,
    citations: guidance.citations,
    aiQuality: guidance.quality,
    createdAt: nowIso()
  });

  await addDoc(collection(db, "aiQualityLogs"), {
    parentId: user.uid,
    childId: payload.childId,
    mode: "checkin",
    provider: guidance.provider,
    model: guidance.quality.model,
    fallbackUsed: guidance.quality.fallbackUsed,
    parseMode: guidance.quality.parseMode,
    promptVersion: guidance.quality.promptVersion,
    latencyMs: guidance.quality.latencyMs,
    uncertaintyLevel: guidance.uncertainty.level,
    uncertaintyReason: guidance.uncertainty.reason,
    citationCount: guidance.citations.length,
    citations: guidance.citations,
    hadConversationContext: guidance.quality.hadConversationContext,
    hadMilestoneContext: guidance.quality.hadMilestoneContext,
    hadParentContext: guidance.quality.hadParentContext,
    createdAt: nowIso(),
    source: "worker.checkin"
  });

  return guidance;
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
