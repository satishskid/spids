import { CSSProperties, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  askQuestion,
  BlogPost,
  createChildProfile,
  exportParentProfileSnapshot,
  fetchDailyBlogs,
  fetchMilestoneWall,
  FivePartResponse,
  getChildProfileSummary,
  getCurrentUid,
  getDevelopmentTimeline,
  importScreeningCredential,
  interpretCheckin,
  MilestoneWallItem,
  saveHomeScreening,
  TimelineEvent
} from "./api/functions";

type ChatRole = "assistant" | "user";
type ChatMode = "ask" | "checkin";
type WallZoom = "focused" | "detailed" | "full";

interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  fivePart?: FivePartResponse;
  contextLabel?: string;
  sourceLabel?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function formatFivePart(reply: FivePartResponse): string {
  return [
    "1) What is happening developmentally",
    reply.whatIsHappeningDevelopmentally,
    "",
    "2) What parents may notice",
    reply.whatParentsMayNotice,
    "",
    "3) What is normal variation",
    reply.whatIsNormalVariation,
    "",
    "4) What to do at home",
    reply.whatToDoAtHome,
    "",
    "5) When to seek clinical screening",
    reply.whenToSeekClinicalScreening
  ].join("\n");
}

function eventLabel(event: TimelineEvent): string {
  if (event.type === "observation") {
    return "Chat";
  }
  if (event.type === "dailyCheckin") {
    return "Daily check-in";
  }
  if (event.type === "homeScreening") {
    return "Parent observation";
  }
  return "Clinic screening";
}

function truncate(text: string, size = 110): string {
  if (text.length <= size) {
    return text;
  }
  return `${text.slice(0, size - 1)}...`;
}

function eventPreview(event: TimelineEvent): string {
  const payload = event.payload as Record<string, unknown>;
  if (event.type === "observation") {
    return truncate(String(payload.question ?? "Parent asked a developmental question."), 46);
  }
  if (event.type === "dailyCheckin") {
    return truncate(String(payload.summary ?? "Daily check-in saved."), 46);
  }
  if (event.type === "homeScreening") {
    return truncate(String(payload.notes ?? "Parent observation logged."), 46);
  }
  return truncate(String(payload.credentialType ?? "Clinic report appended."), 46);
}

function domainLabel(value: string): string {
  if (!value) {
    return "General";
  }
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function domainClassName(value: string): string {
  return (value || "general").toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

function milestonePrompt(milestone: MilestoneWallItem, ageMonths: number): string {
  return [
    `Explain this ${domainLabel(milestone.domain)} milestone for my ${ageMonths}-month child: ${milestone.milestoneTitle}.`,
    `Age band: ${milestone.ageMinMonths}-${milestone.ageMaxMonths} months.`,
    `What I should observe: ${milestone.observableSigns || "not listed"}.`,
    "Please give practical home actions and when to seek screening."
  ].join(" ");
}

function milestoneBand(milestone: MilestoneWallItem, childAgeMonths: number): "near" | "soon" | "later" {
  const mid = (milestone.ageMinMonths + milestone.ageMaxMonths) / 2;
  const distance = Math.abs(mid - childAgeMonths);
  if (distance <= 3) {
    return "near";
  }
  if (distance <= 8) {
    return "soon";
  }
  return "later";
}

function milestoneWeight(milestone: MilestoneWallItem, childAgeMonths: number): "major" | "minor" {
  if (milestone.priority === "major" || milestone.priority === "minor") {
    return milestone.priority;
  }
  const midpoint = (milestone.ageMinMonths + milestone.ageMaxMonths) / 2;
  const nearChildAge = Math.abs(midpoint - childAgeMonths) <= 2;
  const broadSpan = milestone.ageMaxMonths - milestone.ageMinMonths >= 3;
  return nearChildAge || broadSpan ? "major" : "minor";
}

function pointsFromText(text: string, max = 3): string[] {
  return text
    .split(/[.;]\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .slice(0, max);
}

function supportContextLabel(ageMonths: number, domain: string, contextLabel = ""): string {
  if (contextLabel.trim().length > 0) {
    return contextLabel;
  }
  return `${ageMonths} months • ${domainLabel(domain)} focus`;
}

function workerImageResolverUrl(link: string): string {
  const base = String(import.meta.env.VITE_WORKER_BASE_URL ?? "").trim().replace(/\/$/, "");
  if (!base || !link) {
    return "";
  }
  return `${base}/v1/blog-image?link=${encodeURIComponent(link)}&v=2`;
}

function buildImageCandidates(imageUrl: string, link: string): string[] {
  const candidates: string[] = [];
  const add = (value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }
    if (!candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  };

  add(imageUrl);
  add(workerImageResolverUrl(link));

  try {
    if (imageUrl) {
      const parsed = new URL(imageUrl);
      if (parsed.search.length > 0) {
        parsed.search = "";
        parsed.hash = "";
        add(parsed.toString());
      }
    }
  } catch {
    // keep existing candidates
  }

  return candidates;
}

function internalBlogPath(link: string): string {
  const fallback = "/blog/";
  if (!link) {
    return fallback;
  }

  try {
    const parsed = new URL(link, "https://skids.clinic");
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "skids.clinic") {
      return fallback;
    }
    if (!parsed.pathname.startsWith("/blog/")) {
      return fallback;
    }
    const id = parsed.pathname.split("/").filter(Boolean)[1] ?? "";
    if (!id) {
      return fallback;
    }
    return `/blog/${id}/`;
  } catch {
    return fallback;
  }
}

function BlogImage(props: { imageUrl: string; link: string; title: string }) {
  const { imageUrl, link, title } = props;
  const candidates = useMemo(() => buildImageCandidates(imageUrl, link), [imageUrl, link]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [imageUrl, link]);

  const activeSrc = candidates[candidateIndex];
  if (!activeSrc) {
    return <div className="blog-fallback">SKIDS</div>;
  }

  return (
    <img
      src={activeSrc}
      alt={title}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() =>
        setCandidateIndex((prev) => {
          if (prev >= candidates.length) {
            return prev;
          }
          return prev + 1;
        })
      }
    />
  );
}

const WALL_ZOOM_CONFIG: Record<
  WallZoom,
  {
    spanMonths: number;
    fetchLimit: number;
    renderLimit: number;
    tickStepMonths: number;
    bucketDensity: number;
    lanePattern: number[];
    laneSpacing: number;
    lineWidthPercent: number;
  }
> = {
  focused: {
    spanMonths: 10,
    fetchLimit: 320,
    renderLimit: 20,
    tickStepMonths: 1,
    bucketDensity: 2.4,
    lanePattern: [0, 1, 2],
    laneSpacing: 16,
    lineWidthPercent: 62
  },
  detailed: {
    spanMonths: 18,
    fetchLimit: 520,
    renderLimit: 36,
    tickStepMonths: 1,
    bucketDensity: 1.8,
    lanePattern: [0, 1, 2, 3],
    laneSpacing: 14,
    lineWidthPercent: 68
  },
  full: {
    spanMonths: 32,
    fetchLimit: 840,
    renderLimit: 70,
    tickStepMonths: 1,
    bucketDensity: 1.4,
    lanePattern: [0, 1, 2, 3, 4, 5],
    laneSpacing: 10,
    lineWidthPercent: 76
  }
};

export function App() {
  const [uid, setUid] = useState("");
  const [authError, setAuthError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [childId, setChildId] = useState("");
  const [childName, setChildName] = useState("");
  const [ageMonths, setAgeMonths] = useState(36);
  const [domain, setDomain] = useState("motor");
  const [wallZoom, setWallZoom] = useState<WallZoom>("detailed");
  const [profileEditOpen, setProfileEditOpen] = useState(false);

  const [chatMode, setChatMode] = useState<ChatMode>("ask");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      createdAt: nowIso(),
      text:
        "I am your SKIDS pediatric companion. I help you understand the wonder of your child's growth with empathetic, science-based guidance. I am not a diagnostic tool, and I will tell you when to involve your pediatrician."
    }
  ]);

  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [blogQuery, setBlogQuery] = useState("");
  const [blogError, setBlogError] = useState("");
  const [selectedBlogLink, setSelectedBlogLink] = useState("");

  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [milestones, setMilestones] = useState<MilestoneWallItem[]>([]);
  const [activeMilestoneId, setActiveMilestoneId] = useState("");
  const [milestoneError, setMilestoneError] = useState("");
  const [milestoneSheetId, setMilestoneSheetId] = useState("");
  const [chatContext, setChatContext] = useState("");

  const [screeningNotes, setScreeningNotes] = useState("");
  const [resultCategory, setResultCategory] = useState<
    "on_track" | "observe" | "screening_recommended"
  >("on_track");
  const [credentialJson, setCredentialJson] = useState("{}");

  const [isBusy, setIsBusy] = useState(false);
  const [statusLine, setStatusLine] = useState("Ready");
  const chatPanelRef = useRef<HTMLElement | null>(null);
  const wallZoomConfig = WALL_ZOOM_CONFIG[wallZoom];

  useEffect(() => {
    void (async () => {
      try {
        const currentUid = await getCurrentUid();
        setUid(currentUid);
        setChildId(currentUid);
        setAuthError("");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Authentication failed";
        setAuthError(message);
        setStatusLine(`Auth error: ${message}`);
      }
    })();
  }, []);

  useEffect(() => {
    if (!uid || authError) {
      return;
    }

    void (async () => {
      try {
        const child = await getChildProfileSummary(uid);
        if (!child) {
          return;
        }

        if (child.name) {
          setChildName(child.name);
        }
        if (child.ageMonths > 0) {
          setAgeMonths(child.ageMonths);
        }
      } catch {
        // no-op for first-time users.
      }
    })();
  }, [uid, authError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const items = await fetchDailyBlogs(blogQuery);
          setBlogs(items);
          setSelectedBlogLink((current) =>
            items.some((item) => item.link === current) ? current : (items[0]?.link ?? "")
          );
          setBlogError("");
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to load blogs";
          setBlogError(message);
        }
      })();
    }, 220);

    return () => clearTimeout(timer);
  }, [blogQuery]);

  useEffect(() => {
    if (!childId || authError) {
      return;
    }

    void refreshTimeline();
  }, [childId, authError]);

  useEffect(() => {
    if (authError) {
      return;
    }

    void (async () => {
      try {
        const items = await fetchMilestoneWall({
          ageMonths,
          domain,
          limit: wallZoomConfig.fetchLimit,
          spanMonths: wallZoomConfig.spanMonths
        });
        setMilestones(items);
        setActiveMilestoneId((current) =>
          items.some((milestone) => milestone.id === current) ? current : (items[0]?.id ?? "")
        );
        setMilestoneError("");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load milestones";
        setMilestoneError(message);
      }
    })();
  }, [ageMonths, domain, authError, wallZoom]);

  const selectedBlog = useMemo(() => {
    if (blogs.length === 0) {
      return null;
    }
    if (!selectedBlogLink) {
      return blogs[0];
    }
    return blogs.find((blog) => blog.link === selectedBlogLink) ?? blogs[0];
  }, [blogs, selectedBlogLink]);

  const shortUid = useMemo(() => (uid ? `${uid.slice(0, 12)}...` : "Connecting"), [uid]);
  const canUseChat = !authError && childId.length > 0;
  const blogCountLabel = useMemo(() => {
    if (blogQuery.trim().length > 0) {
      return `${blogs.length} matches for "${blogQuery.trim()}"`;
    }
    return `${blogs.length} articles from SKIDS feed`;
  }, [blogs.length, blogQuery]);
  const profileSummary = useMemo(() => {
    const nameText = childName.trim().length > 0 ? `${childName.trim()} is` : "Your child is";
    return `${nameText} ${ageMonths} months old. Current milestone focus: ${domainLabel(domain)}.`;
  }, [childName, ageMonths, domain]);
  const wallSignals = useMemo(() => timeline.slice(0, 4), [timeline]);
  const displayMilestones = useMemo(
    () =>
      [...milestones]
        .sort(
          (left, right) =>
            (left.ageMinMonths + left.ageMaxMonths) / 2 - (right.ageMinMonths + right.ageMaxMonths) / 2
        )
        .slice(0, wallZoomConfig.renderLimit),
    [milestones, wallZoomConfig.renderLimit]
  );
  const activeMilestone = useMemo(
    () => displayMilestones.find((milestone) => milestone.id === activeMilestoneId) ?? null,
    [displayMilestones, activeMilestoneId]
  );
  const milestoneSheet = useMemo(
    () => displayMilestones.find((milestone) => milestone.id === milestoneSheetId) ?? null,
    [displayMilestones, milestoneSheetId]
  );
  const activeStreamMilestones = useMemo(
    () =>
      [...displayMilestones]
        .sort((left, right) => {
          const leftMid = (left.ageMinMonths + left.ageMaxMonths) / 2;
          const rightMid = (right.ageMinMonths + right.ageMaxMonths) / 2;
          return Math.abs(leftMid - ageMonths) - Math.abs(rightMid - ageMonths);
        })
        .slice(0, 3),
    [displayMilestones, ageMonths]
  );
  const completedMilestones = useMemo(
    () =>
      displayMilestones
        .filter((milestone) => milestone.ageMaxMonths <= ageMonths)
        .slice(-2)
        .reverse(),
    [displayMilestones, ageMonths]
  );
  const upcomingMilestones = useMemo(
    () => displayMilestones.filter((milestone) => milestone.ageMinMonths > ageMonths).slice(0, 2),
    [displayMilestones, ageMonths]
  );
  const quickPromptMilestone = useMemo(
    () => activeStreamMilestones[0] ?? activeMilestone ?? null,
    [activeStreamMilestones, activeMilestone]
  );

  const scaleBounds = useMemo(() => {
    const rawMin =
      displayMilestones.length > 0
        ? Math.min(...displayMilestones.map((milestone) => milestone.ageMinMonths))
        : ageMonths - 12;
    const rawMax =
      displayMilestones.length > 0
        ? Math.max(...displayMilestones.map((milestone) => milestone.ageMaxMonths))
        : ageMonths + 12;

    const minWithPadding = Math.max(0, Math.min(rawMin, ageMonths) - 3);
    const maxWithPadding = Math.max(minWithPadding + 3, Math.max(rawMax, ageMonths) + 3);
    const start = Math.floor(minWithPadding / 3) * 3;
    const end = Math.ceil(maxWithPadding / 3) * 3;

    return {
      start,
      end: Math.max(start + 3, end),
      span: Math.max(3, end - start)
    };
  }, [displayMilestones, ageMonths]);

  const scaleTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let month = scaleBounds.start; month <= scaleBounds.end; month += wallZoomConfig.tickStepMonths) {
      ticks.push(month);
    }
    return ticks;
  }, [scaleBounds, wallZoomConfig.tickStepMonths]);

  function monthToPercent(month: number): number {
    const clamped = Math.min(scaleBounds.end, Math.max(scaleBounds.start, month));
    return ((clamped - scaleBounds.start) / scaleBounds.span) * 100;
  }

  function signalPosition(index: number, total: number): number {
    const fraction = (total - index) / (total + 1);
    return Math.max(6, Math.min(94, fraction * 100));
  }

  const laidOutMilestones = useMemo(() => {
    const bucketUseCount = new Map<number, number>();
    const lanePattern = wallZoomConfig.lanePattern;

    return displayMilestones.map((milestone) => {
      const midpoint = (milestone.ageMinMonths + milestone.ageMaxMonths) / 2;
      const position = monthToPercent(midpoint);
      const bucket = Math.round(position / wallZoomConfig.bucketDensity);
      const usage = bucketUseCount.get(bucket) ?? 0;
      bucketUseCount.set(bucket, usage + 1);

      return {
        milestone,
        position,
        lane: lanePattern[usage % lanePattern.length],
        delayMs: (usage % lanePattern.length) * 110
      };
    });
  }, [displayMilestones, scaleBounds, wallZoomConfig.lanePattern, wallZoomConfig.bucketDensity]);

  async function withBusy(task: () => Promise<void>) {
    setIsBusy(true);
    try {
      await task();
    } finally {
      setIsBusy(false);
    }
  }

  async function refreshTimeline() {
    try {
      const data = await getDevelopmentTimeline({ childId, limit: 16 });
      setTimeline(data.timeline);
    } catch {
      setTimeline([]);
    }
  }

  async function onSaveProfile(event: FormEvent) {
    event.preventDefault();
    await withBusy(async () => {
      const data = await createChildProfile({ childName, ageMonths });
      setChildId(data.childId);
      setStatusLine("Child profile updated");
      setProfileEditOpen(false);
      await refreshTimeline();
    });
  }

  async function submitChatText(userText: string, mode: ChatMode) {
    if (!userText.trim() || !canUseChat) {
      return;
    }

    setChatInput("");
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", text: userText, createdAt: nowIso() }
    ]);

    await withBusy(async () => {
      try {
        const reply =
          mode === "ask"
            ? await askQuestion({ childId, question: userText, domain })
            : await interpretCheckin({ childId, summary: userText, domain });

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            text: formatFivePart(reply),
            createdAt: nowIso(),
            fivePart: reply,
            contextLabel: supportContextLabel(ageMonths, domain, chatContext),
            sourceLabel: "Source set: CDC milestones + AAP/IAP screening cadence"
          }
        ]);
        setStatusLine("Guidance generated");
        await refreshTimeline();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Request failed";
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-error-${Date.now()}`,
            role: "assistant",
            text: `I could not process that request right now: ${message}`,
            createdAt: nowIso()
          }
        ]);
        setStatusLine("Request failed");
      }
    });
  }

  async function onSubmitChat(event: FormEvent) {
    event.preventDefault();
    const userText = chatInput.trim();
    await submitChatText(userText, chatMode);
  }

  async function onSaveScreening(event: FormEvent) {
    event.preventDefault();
    await withBusy(async () => {
      await saveHomeScreening({ childId, domain, notes: screeningNotes, resultCategory });
      setStatusLine("Parent observation saved");
      setScreeningNotes("");
      await refreshTimeline();
    });
  }

  async function onExportProfile(event: FormEvent) {
    event.preventDefault();
    await withBusy(async () => {
      const exported = await exportParentProfileSnapshot(childId);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-export-${Date.now()}`,
          role: "assistant",
          text: `Child health record export prepared for your pediatric encounter:\n\n${JSON.stringify(exported.payload, null, 2)}`,
          createdAt: nowIso()
        }
      ]);
      setStatusLine("Child health record export ready");
    });
  }

  async function onImportCredential(event: FormEvent) {
    event.preventDefault();
    await withBusy(async () => {
      try {
        const credential = JSON.parse(credentialJson) as Record<string, unknown>;
        const imported = await importScreeningCredential({ childId, credential });
        setStatusLine(
          imported.success
            ? "Clinic report appended to child health record"
            : "Clinic report format check failed"
        );
        await refreshTimeline();
      } catch {
        setStatusLine("Clinic report format is invalid");
      }
    });
  }

  function onNewChat() {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        createdAt: nowIso(),
        text:
          "New chat started. Tell me what you observed today. I will guide you step by step and help you decide what to monitor and when to involve your pediatrician."
      }
    ]);
  }

  function onKeywordSearch(keyword: string) {
    setBlogQuery(keyword);
  }

  function onAskMilestone(milestone: MilestoneWallItem) {
    setChatMode("ask");
    setChatContext(
      `${milestone.milestoneTitle} (${milestone.ageMinMonths}-${milestone.ageMaxMonths} months)`
    );
    void submitChatText(milestonePrompt(milestone, ageMonths), "ask");
    setMilestoneSheetId("");
    chatPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function onMarkMilestoneSeen(milestone: MilestoneWallItem) {
    await withBusy(async () => {
      await saveHomeScreening({
        childId,
        domain: milestone.domain || domain,
        notes: `Observed milestone: ${milestone.milestoneTitle}. ${milestone.observableSigns || ""}`.trim(),
        resultCategory: "on_track"
      });
      setStatusLine(`Saved: ${milestone.milestoneTitle}`);
      setMilestoneSheetId("");
      await refreshTimeline();
    });
  }

  return (
    <>
      <main className={`shell ${sidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
      <aside className={`side ${sidebarOpen ? "expanded" : "collapsed"}`}>
        <section className="card compact-brand parent-summary-card">
          <p className="eyebrow">Parent Profile</p>
          <h2>SKIDS Parent</h2>
          <p className="muted">Session: {shortUid}</p>
          <p className="profile-summary">{profileSummary}</p>
          <p className="status">{isBusy ? "Updating..." : statusLine}</p>

          <div className="inline-actions">
            <button className="ghost mini" type="button" onClick={() => setProfileEditOpen((v) => !v)}>
              {profileEditOpen ? "Hide child edit" : "Edit child details"}
            </button>
            <button className="ghost mini" type="button" onClick={() => setSidebarOpen((v) => !v)}>
              {sidebarOpen ? "Collapse panel" : "Expand panel"}
            </button>
          </div>

          {profileEditOpen ? (
            <form className="stack profile-quick-edit" onSubmit={onSaveProfile}>
              <label htmlFor="childName">Child name</label>
              <input
                id="childName"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="First name"
              />

              <label htmlFor="ageMonths">Age (months)</label>
              <input
                id="ageMonths"
                type="number"
                min={0}
                max={216}
                value={ageMonths}
                onChange={(e) => setAgeMonths(Number(e.target.value))}
              />

              <label htmlFor="domain">Focus domain</label>
              <select id="domain" value={domain} onChange={(e) => setDomain(e.target.value)}>
                <option value="motor">Motor</option>
                <option value="language">Language</option>
                <option value="social">Social</option>
                <option value="cognitive">Cognitive</option>
              </select>

              <button className="primary" type="submit" disabled={isBusy || !!authError}>
                Save Profile
              </button>
            </form>
          ) : null}
        </section>

        {sidebarOpen ? (
          <section
            className={`card milestone-wall vertical-milestone-wall domain-${domainClassName(domain)}`}
          >
            <div className="atlas-head">
              <h3>
                <span className="atlas-dot" />
                Milestone Atlas
              </h3>
              <div className="atlas-head-actions">
                <button className="ghost mini" type="button" onClick={() => void refreshTimeline()}>
                  Refresh
                </button>
                <div className="wall-zoom-options atlas-zoom-options">
                  {(["focused", "detailed", "full"] as WallZoom[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`wall-zoom-pill ${wallZoom === option ? "active" : ""}`}
                      onClick={() => setWallZoom(option)}
                      aria-pressed={wallZoom === option}
                    >
                      {option === "focused" ? "Focused" : option === "detailed" ? "Detailed" : "Full"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="muted wall-subtext">Focused on {ageMonths} months • {domainLabel(domain)} domain</p>
            <p className="muted wall-count">{displayMilestones.length} milestones loaded</p>
            <p className="muted wall-evidence">Evidence set: CDC milestones + AAP/IAP screening cadence.</p>
            <div className="scale-legend">
              <span className="legend-pill near">Now</span>
              <span className="legend-pill soon">Soon</span>
              <span className="legend-pill later">Later</span>
            </div>

            {milestoneError ? <p className="muted">Milestone issue: {milestoneError}</p> : null}

            <div className="atlas-checklist">
              {completedMilestones.length === 0 ? (
                <div className="atlas-check-row muted">No parent-confirmed milestones yet. Start with one check-in.</div>
              ) : (
                completedMilestones.map((milestone, index) => (
                  <div key={`done-${milestone.id}`} className="atlas-check-row">
                    <span className="atlas-check">✓</span>
                    <span>{milestone.milestoneTitle}</span>
                    <em>{index === 0 ? "recent" : "earlier"}</em>
                  </div>
                ))
              )}
            </div>

            <div className="atlas-divider">
              <span>IN FOCUS NOW</span>
            </div>

            <div className="vertical-scale-canvas atlas-canvas">
              <div className="vertical-ruler-line" />

              {scaleTicks.map((tick) => (
                <span
                  key={`tick-${tick}`}
                  className={`vertical-tick ${
                    tick % 6 === 0 ? "major" : tick % 3 === 0 ? "mid" : "minor"
                  }`}
                  style={{ bottom: `${monthToPercent(tick)}%` }}
                >
                  {tick % 3 === 0 ? <em>{tick}m</em> : null}
                </span>
              ))}

              <span className="vertical-now-pin" style={{ bottom: `${monthToPercent(ageMonths)}%` }}>
                <em>Now</em>
              </span>

              {laidOutMilestones.map(({ milestone, position, lane, delayMs }) => {
                const band = milestoneBand(milestone, ageMonths);
                const weight = milestoneWeight(milestone, ageMonths);
                const active = activeMilestoneId === milestone.id;
                const milestoneDomain = domainClassName(milestone.domain || domain);
                const visualPosition = Math.max(4, Math.min(96, position));
                const lineStyle: CSSProperties = {
                  bottom: `${visualPosition}%`,
                  left: `calc(24% + 8px + ${lane * wallZoomConfig.laneSpacing}px)`,
                  width: `calc(${wallZoomConfig.lineWidthPercent}% - ${lane * wallZoomConfig.laneSpacing}px)`,
                  animationDelay: `${delayMs}ms`
                };

                return (
                  <button
                    type="button"
                    key={milestone.id}
                    className={`milestone-line ${weight} domain-${milestoneDomain} ${band} ${active ? "active" : ""} ${
                      band === "near" ? "pulse" : ""
                    }`}
                    style={lineStyle}
                    onClick={() => {
                      setActiveMilestoneId(milestone.id);
                      setMilestoneSheetId(milestone.id);
                    }}
                    disabled={isBusy || !!authError}
                    aria-label={`Milestone ${milestone.milestoneTitle}`}
                  >
                    <span className="milestone-line-track" />
                    <span className="milestone-line-node" />
                    <span className="milestone-line-label">{truncate(milestone.milestoneTitle, 56)}</span>
                  </button>
                );
              })}

              {wallSignals.map((event, index) => (
                <article
                  key={`signal-${event.type}-${event.createdAt}`}
                  className="signal-node"
                  style={{ bottom: `${signalPosition(index, wallSignals.length)}%` }}
                >
                  <strong>{eventLabel(event)}</strong>
                  <p>{eventPreview(event)}</p>
                </article>
              ))}
            </div>

            <div className="atlas-stream-list">
              {activeStreamMilestones.map((milestone) => (
                <button
                  key={`stream-${milestone.id}`}
                  type="button"
                  className={`atlas-stream-card domain-${domainClassName(milestone.domain || domain)}`}
                  onClick={() => {
                    setActiveMilestoneId(milestone.id);
                    setMilestoneSheetId(milestone.id);
                  }}
                >
                    <span className="stream-domain">{domainLabel(milestone.domain || domain)}</span>
                    <h5>{milestone.milestoneTitle}</h5>
                    <p>{truncate(milestone.observableSigns || milestone.homeActions || "Tap to open details.", 84)}</p>
                  </button>
              ))}
            </div>

            {upcomingMilestones.length > 0 ? (
              <>
                <div className="atlas-divider">
                  <span>NEXT UP</span>
                </div>
                <div className="upcoming-list">
                  {upcomingMilestones.map((milestone) => (
                    <button
                      key={`upcoming-${milestone.id}`}
                      type="button"
                      className="upcoming-card"
                      onClick={() => {
                        setActiveMilestoneId(milestone.id);
                        setMilestoneSheetId(milestone.id);
                      }}
                    >
                      <strong>{milestone.milestoneTitle}</strong>
                      <span>
                        {milestone.ageMinMonths}-{milestone.ageMaxMonths} months
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {quickPromptMilestone ? (
              <button
                className="ghost mini ask-bead"
                type="button"
                onClick={() => onAskMilestone(quickPromptMilestone)}
                disabled={isBusy || !!authError}
              >
                Ask SKIDS about this milestone
              </button>
            ) : null}
          </section>
        ) : null}
      </aside>

      <section className="main">
        <section className="hero-blog">
          <div className="hero-top">
            <button className="ghost side-toggle" type="button" onClick={() => setSidebarOpen((v) => !v)}>
              {sidebarOpen ? "Hide milestone wall" : "Show milestone wall"}
            </button>
            <p className="muted">Nudging confident parenting through growth science and regular checkups.</p>
          </div>

          {authError ? (
            <div className="auth-alert">
              <strong>Authentication setup needed</strong>
              <p>{authError}</p>
            </div>
          ) : null}

          {selectedBlog ? (
            <article className="featured-blog">
              <div className="featured-image">
                {selectedBlog.imageUrl ? (
                  <BlogImage imageUrl={selectedBlog.imageUrl} link={selectedBlog.link} title={selectedBlog.title} />
                ) : (
                  <div className="blog-fallback">SKIDS</div>
                )}
              </div>
              <div className="featured-copy">
                <p className="eyebrow">Featured from SKIDS Knowledge Library</p>
                <h1>{selectedBlog.title}</h1>
                <p>{selectedBlog.excerpt}</p>
                <div className="keyword-row">
                  {selectedBlog.keywords.slice(0, 8).map((keyword) => (
                    <button
                      key={keyword}
                      type="button"
                      className="keyword-pill"
                      onClick={() => onKeywordSearch(keyword)}
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
                <a href={internalBlogPath(selectedBlog.link)}>
                  Read full article on SKIDS
                </a>
              </div>
            </article>
          ) : (
            <article className="featured-blog empty">
              <p className="muted">Loading blog library...</p>
            </article>
          )}

          <div className="blog-search-row">
            <input
              value={blogQuery}
              onChange={(e) => setBlogQuery(e.target.value)}
              placeholder="Search by organ, condition, age, symptoms, habits..."
            />
            <a href="/blog/">
              Source feed
            </a>
          </div>
          <p className="muted blog-count">{blogCountLabel}</p>

          {blogError ? <p className="muted">Blog feed issue: {blogError}</p> : null}

          <div className="blog-row">
            {blogs.length === 0 ? <p className="muted">No blogs found for this keyword.</p> : null}
            {blogs.map((blog) => (
              <button
                type="button"
                key={blog.link}
                className={`blog-card ${selectedBlog?.link === blog.link ? "active" : ""}`}
                onClick={() => setSelectedBlogLink(blog.link)}
              >
                <div className="blog-image-wrap">
                  {blog.imageUrl ? (
                    <BlogImage imageUrl={blog.imageUrl} link={blog.link} title={blog.title} />
                  ) : (
                    <div className="blog-fallback">SKIDS</div>
                  )}
                </div>
                <div className="blog-copy">
                  <h3>{blog.title}</h3>
                  <p>{blog.excerpt}</p>
                  <div className="keyword-row">
                    {blog.keywords.slice(0, 4).map((keyword) => (
                      <span key={keyword}>{keyword}</span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="chat" ref={chatPanelRef}>
          <header className="chat-head">
            <div>
              <h2>SKIDS Chat</h2>
              <p>Ask anything. SKIDS responds like an empathetic pediatric companion with safe medical accuracy.</p>
              {chatContext ? <span className="chat-context">Context: {chatContext}</span> : null}
              <span className="chat-note">
                Parent support program only. Not a diagnosis tool. Every interaction is saved into the child health
                record.
              </span>
            </div>
            <div className="chat-controls">
              <select value={chatMode} onChange={(e) => setChatMode(e.target.value as ChatMode)}>
                <option value="ask">Ask pediatric companion</option>
                <option value="checkin">Log daily observation</option>
              </select>
              <button className="ghost" type="button" onClick={onNewChat}>
                New chat
              </button>
            </div>
          </header>

          <div className="messages">
            {messages.map((message) => (
              <article className={`message ${message.role}`} key={message.id}>
                <div className="message-role">{message.role === "assistant" ? "SKIDS Guide" : "You"}</div>
                {message.role === "assistant" && message.fivePart ? (
                  <div className="assistant-structured">
                    <p className="assistant-summary">{message.fivePart.whatIsHappeningDevelopmentally}</p>
                    <div className="five-part-grid">
                      <section className="five-part-card">
                        <h4>What parents may notice</h4>
                        <p>{message.fivePart.whatParentsMayNotice}</p>
                      </section>
                      <section className="five-part-card">
                        <h4>What is normal variation</h4>
                        <p>{message.fivePart.whatIsNormalVariation}</p>
                      </section>
                      <section className="five-part-card">
                        <h4>What to do at home</h4>
                        <p>{message.fivePart.whatToDoAtHome}</p>
                      </section>
                      <section className="five-part-card">
                        <h4>When to seek clinical screening</h4>
                        <p>{message.fivePart.whenToSeekClinicalScreening}</p>
                      </section>
                    </div>
                    <p className="assistant-meta">
                      <span>{message.contextLabel ?? supportContextLabel(ageMonths, domain, chatContext)}</span>
                      <span>{message.sourceLabel ?? "Source set: CDC milestones + AAP/IAP screening cadence"}</span>
                    </p>
                  </div>
                ) : (
                  <pre>{message.text}</pre>
                )}
              </article>
            ))}
          </div>

          <div className="chat-suggestions">
            <button
              type="button"
              className="suggestion-chip"
              onClick={() => setChatInput("Is this milestone delay still within normal variation?")}
            >
              Is this within normal variation?
            </button>
            <button
              type="button"
              className="suggestion-chip"
              onClick={() => setChatInput("Give me 3 practical at-home exercises for this week.")}
            >
              Home growth activities
            </button>
            <button
              type="button"
              className="suggestion-chip"
              onClick={() => setChatInput("When should I seek a clinical screening?")}
            >
              When to see pediatrician?
            </button>
          </div>

          <form className="composer" onSubmit={onSubmitChat}>
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={
                chatMode === "ask"
                  ? "Ask any growth, milestone, behavior, or parenting concern..."
                  : "Share today's observations to log and interpret..."
              }
            />
            <button className="primary" type="submit" disabled={isBusy || !canUseChat}>
              Send
            </button>
          </form>
        </section>

        <details className="card occasional-actions">
          <summary>Support tools (occasional)</summary>
          <p className="muted occasional-note">
            These are occasional tasks: log structured observations, export child health record, or append clinic
            screening reports.
          </p>

          <details className="mini-action">
            <summary>Home screening check-in</summary>
            <form className="stack" onSubmit={onSaveScreening}>
              <p className="muted">
                Log short parent observations between clinic visits. This passively builds your child health record.
              </p>
              <textarea
                value={screeningNotes}
                onChange={(e) => setScreeningNotes(e.target.value)}
                placeholder="Example: used two-word phrases, climbed stairs with support..."
              />
              <select
                value={resultCategory}
                onChange={(e) =>
                  setResultCategory(e.target.value as "on_track" | "observe" | "screening_recommended")
                }
              >
                <option value="on_track">On track for now</option>
                <option value="observe">Watch and repeat</option>
                <option value="screening_recommended">Discuss with clinician</option>
              </select>
              <button className="ghost" type="submit" disabled={isBusy || !!authError}>
                Save check-in
              </button>
            </form>
          </details>

          <details className="mini-action">
            <summary>Export child health record</summary>
            <form className="stack" onSubmit={onExportProfile}>
              <p className="muted">Generate a structured record to share with your pediatrician or therapist.</p>
              <button className="ghost" type="submit" disabled={isBusy || !!authError}>
                Export record
              </button>
            </form>
          </details>

          <details className="mini-action">
            <summary>Append clinic screening report</summary>
            <form className="stack" onSubmit={onImportCredential}>
              <p className="muted">Paste clinic screening data provided by your clinic.</p>
              <textarea
                value={credentialJson}
                onChange={(e) => setCredentialJson(e.target.value)}
                placeholder='{"assessmentDate":"2026-02-18","clinicId":"...","version":"1.0"}'
              />
              <button className="ghost" type="submit" disabled={isBusy || !!authError}>
                Import report
              </button>
            </form>
          </details>
        </details>
      </section>
      </main>

      {milestoneSheet ? (
        <div className="sheet-backdrop" onClick={() => setMilestoneSheetId("")}>
          <section
            className={`milestone-sheet domain-${domainClassName(milestoneSheet.domain || domain)}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-grab" />
            <div className="sheet-head">
              <p className="eyebrow">
                {domainLabel(milestoneSheet.domain || domain)} • {milestoneSheet.ageMinMonths}-
                {milestoneSheet.ageMaxMonths} months
              </p>
              <button className="sheet-close" type="button" onClick={() => setMilestoneSheetId("")}>
                Close
              </button>
            </div>

            <h3>{milestoneSheet.milestoneTitle}</h3>
            <p className="muted">
              {milestoneSheet.developmentProcess || "This milestone reflects steady developmental progression."}
            </p>

            {milestoneSheet.sourceAuthority ? (
              <p className="sheet-source">
                Source: {milestoneSheet.sourceAuthority}
                {milestoneSheet.sourceUrl ? (
                  <>
                    {" • "}
                    <a href={milestoneSheet.sourceUrl} target="_blank" rel="noreferrer">
                      Reference
                    </a>
                  </>
                ) : null}
              </p>
            ) : null}
            <p className="sheet-note">
              Parent support guidance only. For diagnosis or treatment decisions, use pediatric evaluation.
            </p>

            <div className="sheet-points">
              <h4>What to look for</h4>
              <ul>
                {pointsFromText(milestoneSheet.observableSigns || "Observe day-to-day progress and consistency.").map(
                  (point) => (
                    <li key={`obs-${point}`}>{point}</li>
                  )
                )}
              </ul>
            </div>

            <div className="sheet-points">
              <h4>How to help</h4>
              <ul>
                {pointsFromText(milestoneSheet.homeActions || "Offer short daily practice and repeat calmly.").map(
                  (point) => (
                    <li key={`home-${point}`}>{point}</li>
                  )
                )}
              </ul>
            </div>

            <div className="sheet-actions">
              <button
                className="primary"
                type="button"
                onClick={() => onAskMilestone(milestoneSheet)}
                disabled={isBusy || !!authError}
              >
                Ask SKIDS
              </button>
              <button
                className="ghost"
                type="button"
                onClick={() => void onMarkMilestoneSeen(milestoneSheet)}
                disabled={isBusy || !!authError}
              >
                I saw it today
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
