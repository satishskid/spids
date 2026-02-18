import { FormEvent, useEffect, useState } from "react";
import {
  askQuestion,
  createChildProfile,
  exportParentProfileSnapshot,
  getCurrentUid,
  getDevelopmentTimeline,
  importScreeningCredential,
  interpretCheckin,
  saveHomeScreening
} from "./api/functions";

export function App() {
  const [childId, setChildId] = useState("");
  const [childName, setChildName] = useState("");
  const [ageMonths, setAgeMonths] = useState(36);
  const [domain, setDomain] = useState("motor");
  const [question, setQuestion] = useState("");
  const [checkin, setCheckin] = useState("");
  const [screeningNotes, setScreeningNotes] = useState("");
  const [resultCategory, setResultCategory] = useState<
    "on_track" | "observe" | "screening_recommended"
  >("on_track");
  const [credentialJson, setCredentialJson] = useState("{}");
  const [output, setOutput] = useState("Ready");
  const [isBusy, setIsBusy] = useState(false);
  const [uid, setUid] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const currentUid = await getCurrentUid();
        setUid(currentUid);
        setChildId((existing) => existing || currentUid);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Authentication failed";
        setOutput(JSON.stringify({ error: message }, null, 2));
      }
    })();
  }, []);

  async function run(task: () => Promise<unknown>) {
    setIsBusy(true);
    try {
      const data = await task();
      setOutput(JSON.stringify(data, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown request error";
      setOutput(JSON.stringify({ error: message }, null, 2));
    } finally {
      setIsBusy(false);
    }
  }

  async function onCreateProfile(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const data = await createChildProfile({ childName, ageMonths });
      const created = data as { childId?: string };
      if (created.childId) {
        setChildId(created.childId);
      }
      return data;
    });
  }

  async function onAsk(event: FormEvent) {
    event.preventDefault();
    await run(() => askQuestion({ childId, question, domain }));
  }

  async function onCheckin(event: FormEvent) {
    event.preventDefault();
    await run(() => interpretCheckin({ childId, summary: checkin, domain }));
  }

  async function onHomeScreening(event: FormEvent) {
    event.preventDefault();
    await run(() =>
      saveHomeScreening({
        childId,
        domain,
        notes: screeningNotes,
        resultCategory
      })
    );
  }

  async function onExport(event: FormEvent) {
    event.preventDefault();
    await run(() => exportParentProfileSnapshot(childId));
  }

  async function onImport(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const credential = JSON.parse(credentialJson) as Record<string, unknown>;
      return importScreeningCredential({ childId, credential });
    });
  }

  async function onTimeline(event: FormEvent) {
    event.preventDefault();
    await run(() => getDevelopmentTimeline({ childId, limit: 20 }));
  }

  return (
    <main className="layout">
      <header className="hero">
        <h1>SKIDS Parent</h1>
        <p>Continuous development intelligence for parents.</p>
        <p>User: {uid || "auth pending..."}</p>
      </header>

      <form className="panel" onSubmit={onCreateProfile}>
        <h2>Create Child Profile (MVP)</h2>
        <label htmlFor="childName">Child Name</label>
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
        <button type="submit" disabled={isBusy}>
          Save Profile
        </button>
      </form>

      <section className="panel compact">
        <label htmlFor="childId">Child ID</label>
        <input
          id="childId"
          value={childId}
          onChange={(e) => setChildId(e.target.value)}
          placeholder="Profile ID (defaults to your auth UID)"
        />
        <label htmlFor="domain">Domain</label>
        <select id="domain" value={domain} onChange={(e) => setDomain(e.target.value)}>
          <option value="motor">Motor</option>
          <option value="language">Language</option>
          <option value="social">Social</option>
          <option value="cognitive">Cognitive</option>
        </select>
      </section>

      <section className="grid">
        <form className="panel" onSubmit={onAsk}>
          <h2>Ask Question</h2>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} />
          <button type="submit" disabled={isBusy}>
            Get 5-Part Guidance
          </button>
        </form>

        <form className="panel" onSubmit={onCheckin}>
          <h2>Daily Check-in</h2>
          <textarea value={checkin} onChange={(e) => setCheckin(e.target.value)} />
          <button type="submit" disabled={isBusy}>
            Interpret Check-in
          </button>
        </form>

        <form className="panel" onSubmit={onHomeScreening}>
          <h2>Guided Home Screening</h2>
          <textarea
            value={screeningNotes}
            onChange={(e) => setScreeningNotes(e.target.value)}
            placeholder="Structured observation notes"
          />
          <label htmlFor="resultCategory">Result Category</label>
          <select
            id="resultCategory"
            value={resultCategory}
            onChange={(e) =>
              setResultCategory(e.target.value as "on_track" | "observe" | "screening_recommended")
            }
          >
            <option value="on_track">On Track</option>
            <option value="observe">Observe</option>
            <option value="screening_recommended">Screening Recommended</option>
          </select>
          <button type="submit" disabled={isBusy}>
            Save Screening
          </button>
        </form>

        <form className="panel" onSubmit={onExport}>
          <h2>Export Profile JSON</h2>
          <button type="submit" disabled={isBusy}>
            Export Snapshot
          </button>
        </form>

        <form className="panel" onSubmit={onImport}>
          <h2>Import Screening JSON</h2>
          <textarea
            value={credentialJson}
            onChange={(e) => setCredentialJson(e.target.value)}
          />
          <button type="submit" disabled={isBusy}>
            Validate + Import
          </button>
        </form>

        <form className="panel" onSubmit={onTimeline}>
          <h2>Development Timeline</h2>
          <button type="submit" disabled={isBusy}>
            Load Timeline
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Output</h2>
        <pre>{output}</pre>
      </section>
    </main>
  );
}
