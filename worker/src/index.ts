interface Env {
  GEMINI_API_KEY?: string;
  GROQ_API_KEY?: string;
  FIREBASE_WEB_API_KEY?: string;
  FIREBASE_PROJECT_ID?: string;
}

interface FivePartResponse {
  whatIsHappeningDevelopmentally: string;
  whatParentsMayNotice: string;
  whatIsNormalVariation: string;
  whatToDoAtHome: string;
  whenToSeekClinicalScreening: string;
}

const jsonHeaders = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS"
};

const unsafePhrases = ["diagnosis", "medication", "prescribe", "emergency treatment", "lab result"];

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function enforceSafety(input: string): void {
  const lowered = input.toLowerCase();
  for (const phrase of unsafePhrases) {
    if (lowered.includes(phrase)) {
      throw new Error("Request violates medical safety policy");
    }
  }
}

function ensureFivePart(input: Partial<FivePartResponse>): FivePartResponse {
  const fallback = "Continue observing and tracking changes over time.";
  return {
    whatIsHappeningDevelopmentally: input.whatIsHappeningDevelopmentally || fallback,
    whatParentsMayNotice: input.whatParentsMayNotice || fallback,
    whatIsNormalVariation: input.whatIsNormalVariation || fallback,
    whatToDoAtHome: input.whatToDoAtHome || fallback,
    whenToSeekClinicalScreening: input.whenToSeekClinicalScreening || fallback
  };
}

function extractJson(text: string): unknown {
  const stripped = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(stripped);
}

function buildSystemPrompt(mode: "ask" | "checkin", input: string, context: string): string {
  return [
    "You are a pediatric developmental support assistant.",
    "Never diagnose disease, prescribe treatment, interpret lab results, or provide emergency advice.",
    "Return ONLY JSON with exactly these keys:",
    "whatIsHappeningDevelopmentally, whatParentsMayNotice, whatIsNormalVariation, whatToDoAtHome, whenToSeekClinicalScreening",
    `Mode: ${mode}`,
    `Parent input: ${input}`,
    `Milestone context: ${context || "none provided"}`
  ].join("\n");
}

async function verifyFirebaseToken(token: string, env: Env): Promise<string | null> {
  if (!env.FIREBASE_WEB_API_KEY) {
    return null;
  }

  const verify = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_WEB_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken: token })
    }
  );

  if (!verify.ok) {
    return null;
  }

  const data = (await verify.json()) as { users?: Array<{ localId?: string }> };
  return data.users?.[0]?.localId ?? null;
}

async function callGemini(prompt: string, env: Env): Promise<FivePartResponse> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini failed with status ${res.status}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  return ensureFivePart(extractJson(text) as Partial<FivePartResponse>);
}

async function callGroq(prompt: string, env: Env): Promise<FivePartResponse> {
  if (!env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY");
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!res.ok) {
    throw new Error(`Groq failed with status ${res.status}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? "{}";
  return ensureFivePart(extractJson(text) as Partial<FivePartResponse>);
}

function getBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return null;
  }
  return auth.slice("Bearer ".length).trim();
}

async function handleAiRequest(request: Request, env: Env, mode: "ask" | "checkin"): Promise<Response> {
  const bearer = getBearerToken(request);
  if (!bearer) {
    return response({ error: "Missing bearer token" }, 401);
  }

  const uid = await verifyFirebaseToken(bearer, env);
  if (!uid) {
    return response({ error: "Invalid Firebase auth token" }, 401);
  }

  const payload = (await request.json()) as {
    question?: string;
    summary?: string;
    milestoneContext?: string;
  };

  const sourceText = mode === "ask" ? payload.question ?? "" : payload.summary ?? "";
  if (!sourceText.trim()) {
    return response({ error: "Missing input text" }, 400);
  }

  try {
    enforceSafety(sourceText);
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Unsafe input" }, 400);
  }

  const prompt = buildSystemPrompt(mode, sourceText, payload.milestoneContext ?? "");

  try {
    const gemini = await callGemini(prompt, env);
    return response({ uid, provider: "gemini", response: gemini });
  } catch {
    try {
      const groq = await callGroq(prompt, env);
      return response({ uid, provider: "groq", response: groq });
    } catch (error) {
      return response(
        {
          error: "AI providers unavailable",
          details: error instanceof Error ? error.message : "Unknown provider error"
        },
        502
      );
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: jsonHeaders });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return response({ ok: true, service: "pairents" });
    }

    if (request.method === "POST" && url.pathname === "/v1/ask") {
      return handleAiRequest(request, env, "ask");
    }

    if (request.method === "POST" && url.pathname === "/v1/checkin") {
      return handleAiRequest(request, env, "checkin");
    }

    return response({ error: "Not found" }, 404);
  }
};
