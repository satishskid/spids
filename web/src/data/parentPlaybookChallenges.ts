export type PlaybookDomain = "motor" | "language" | "social" | "cognitive" | "general";

export interface ParentPlaybookChallenge {
  id: string;
  title: string;
  framework: "H.A.B.I.T.S" | "F.R.E.S.H" | "S.M.A.R.T" | "A.B.C.D.E";
  category: "healthy_habits" | "nutrition" | "digital_parenting" | "relationship";
  minAgeMonths: number;
  maxAgeMonths: number;
  domains: PlaybookDomain[];
  summary: string;
  steps: string[];
  points: number;
  sourceHint: string;
}

const CHALLENGES: ParentPlaybookChallenge[] = [
  {
    id: "habits-power-down",
    title: "Power-Down Hour",
    framework: "H.A.B.I.T.S",
    category: "healthy_habits",
    minAgeMonths: 24,
    maxAgeMonths: 216,
    domains: ["cognitive", "social", "general"],
    summary: "Create a predictable bedtime runway to support sleep quality and next-day regulation.",
    steps: [
      "Set one fixed power-down start time for tonight.",
      "No screens in the final 45-60 minutes before sleep.",
      "Log whether settling was easier than usual."
    ],
    points: 30,
    sourceHint: "SKIDS Healthy Habits workshop pattern"
  },
  {
    id: "habits-sunlight",
    title: "Morning Sunlight Starter",
    framework: "H.A.B.I.T.S",
    category: "healthy_habits",
    minAgeMonths: 12,
    maxAgeMonths: 216,
    domains: ["motor", "cognitive", "general"],
    summary: "Morning light supports circadian rhythm, sleep timing, mood, and daytime alertness.",
    steps: [
      "Get 10-15 minutes of natural light in the morning.",
      "Pair it with hydration and light movement.",
      "Note appetite, mood, and focus by afternoon."
    ],
    points: 25,
    sourceHint: "SKIDS Healthy Habits workshop pattern"
  },
  {
    id: "fresh-rainbow-plate",
    title: "Rainbow Plate Check",
    framework: "F.R.E.S.H",
    category: "nutrition",
    minAgeMonths: 12,
    maxAgeMonths: 216,
    domains: ["motor", "cognitive", "general"],
    summary: "Color variety increases nutrient diversity and supports growth, attention, and gut health.",
    steps: [
      "Build one meal with at least 3 color groups.",
      "Include one fiber source and one protein anchor.",
      "Log energy and mood 2 hours later."
    ],
    points: 20,
    sourceHint: "SKIDS Fueling Potential workshop pattern"
  },
  {
    id: "fresh-sugar-detective",
    title: "Sugar Detective",
    framework: "F.R.E.S.H",
    category: "nutrition",
    minAgeMonths: 18,
    maxAgeMonths: 216,
    domains: ["motor", "cognitive", "general"],
    summary: "Label awareness helps avoid fast sugar spikes and post-snack mood crashes.",
    steps: [
      "Check one packaged snack label for added sugar.",
      "If high sugar, offer a lower-sugar alternate with protein/fiber.",
      "Observe behavior and focus in the next 90 minutes."
    ],
    points: 25,
    sourceHint: "SKIDS Fueling Potential workshop pattern"
  },
  {
    id: "smart-dopamine-audit",
    title: "Dopamine Audit",
    framework: "S.M.A.R.T",
    category: "digital_parenting",
    minAgeMonths: 72,
    maxAgeMonths: 216,
    domains: ["social", "cognitive", "general"],
    summary: "Measure how a specific app impacts mood before and after use to guide healthier digital choices.",
    steps: [
      "Before app time, rate mood from 1-10.",
      "After 20-30 minutes, rate mood again.",
      "If mood drops, set a shorter limit and replace with an off-screen activity."
    ],
    points: 35,
    sourceHint: "SKIDS Screen Smart workshop pattern"
  },
  {
    id: "smart-sleep-sanctuary",
    title: "Sleep Sanctuary",
    framework: "S.M.A.R.T",
    category: "digital_parenting",
    minAgeMonths: 48,
    maxAgeMonths: 216,
    domains: ["cognitive", "social", "general"],
    summary: "Protect sleep by moving devices out of the sleep zone and using a simple physical alarm.",
    steps: [
      "Create one family charging station outside bedrooms.",
      "Move devices out 45 minutes before bedtime.",
      "Confirm wake/sleep quality tomorrow."
    ],
    points: 30,
    sourceHint: "SKIDS Screen Smart workshop pattern"
  },
  {
    id: "abcde-acknowledge-first",
    title: "Acknowledge First",
    framework: "A.B.C.D.E",
    category: "relationship",
    minAgeMonths: 60,
    maxAgeMonths: 216,
    domains: ["social", "language", "general"],
    summary: "Reduce conflict intensity by validating emotion before problem-solving.",
    steps: [
      "When tension rises, name the feeling first.",
      "Use one non-judgment sentence before advice.",
      "Check if the conversation de-escalated within 2-3 minutes."
    ],
    points: 30,
    sourceHint: "SKIDS DigiParenting workshop pattern"
  },
  {
    id: "abcde-choose-trial",
    title: "Choose a 7-Day Trial Plan",
    framework: "A.B.C.D.E",
    category: "relationship",
    minAgeMonths: 60,
    maxAgeMonths: 216,
    domains: ["social", "language", "general"],
    summary: "Convert recurring conflict into a short-term experiment rather than a power struggle.",
    steps: [
      "Brainstorm 2-3 practical options together.",
      "Pick one option as a 7-day trial with clear start/end.",
      "Schedule a short review conversation after the trial."
    ],
    points: 35,
    sourceHint: "SKIDS DigiParenting workshop pattern"
  }
];

function midpointMonths(challenge: ParentPlaybookChallenge): number {
  return (challenge.minAgeMonths + challenge.maxAgeMonths) / 2;
}

function challengeScore(challenge: ParentPlaybookChallenge, ageMonths: number, domain: string): number {
  const normalizedDomain = domain.trim().toLowerCase();
  const distance = Math.abs(midpointMonths(challenge) - ageMonths);
  const inBand = ageMonths >= challenge.minAgeMonths && ageMonths <= challenge.maxAgeMonths;
  const domainMatch = challenge.domains.includes(normalizedDomain as PlaybookDomain);

  let score = 0;
  if (inBand) {
    score += 30;
  } else if (distance <= 12) {
    score += 15;
  } else {
    score += Math.max(3, 10 - Math.floor(distance / 18));
  }

  if (domainMatch) {
    score += 16;
  } else if (challenge.domains.includes("general")) {
    score += 6;
  }

  return score;
}

export function pickPlaybookChallenges(input: {
  ageMonths: number;
  domain: string;
  limit?: number;
}): ParentPlaybookChallenge[] {
  const ranked = [...CHALLENGES].sort((left, right) => {
    const scoreDelta = challengeScore(right, input.ageMonths, input.domain) - challengeScore(left, input.ageMonths, input.domain);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }
    return midpointMonths(left) - midpointMonths(right);
  });

  return ranked.slice(0, Math.max(1, input.limit ?? 3));
}
