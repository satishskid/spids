export type FocusDomain = "motor" | "language" | "social" | "cognitive" | "general";

export interface BodyWonderTopic {
  id: string;
  title: string;
  subtitle: string;
  track: "organ" | "development";
  primaryDomain: FocusDomain;
  minAgeMonths: number;
  maxAgeMonths: number;
  whyItMatters: string;
  whatToLookFor: string[];
  tryAtHome: string[];
  whenToCheckWithPediatrician: string;
  relatedKeywords: string[];
  sourceAuthority: string;
  sourceUrl: string;
}

const CDC = "CDC Learn the Signs. Act Early";
const AAP = "American Academy of Pediatrics (HealthyChildren)";

const TOPICS: BodyWonderTopic[] = [
  {
    id: "social-smile",
    title: "Social Smile",
    subtitle: "Social-emotional growth",
    track: "development",
    primaryDomain: "social",
    minAgeMonths: 2,
    maxAgeMonths: 5,
    whyItMatters: "Shared smiling is an early sign of social connection, attention, and reciprocity.",
    whatToLookFor: [
      "Smiles back to your face or voice during interaction.",
      "Looks toward caregiver and brightens in response.",
      "Shows repeated interest in social play."
    ],
    tryAtHome: [
      "Use face-to-face talking and pause to invite response.",
      "Repeat short smile-and-sound games several times daily.",
      "Keep interactions warm and predictable."
    ],
    whenToCheckWithPediatrician: "If social response remains limited by 4-5 months or you feel connection cues are absent.",
    relatedKeywords: ["social smile", "bonding", "interaction", "early communication"],
    sourceAuthority: CDC,
    sourceUrl: "https://www.cdc.gov/act-early/milestones/4-months.html"
  },
  {
    id: "head-control",
    title: "Head Control and Posture",
    subtitle: "Neck and core foundations",
    track: "development",
    primaryDomain: "motor",
    minAgeMonths: 3,
    maxAgeMonths: 6,
    whyItMatters: "Head and trunk control are foundational for rolling, sitting, and later balance skills.",
    whatToLookFor: [
      "Head steadier during supported sitting.",
      "Longer tolerance in tummy time.",
      "Gradual improvement in midline control."
    ],
    tryAtHome: [
      "Use short, frequent tummy-time sessions while awake.",
      "Place toys at eye level to encourage lift and tracking.",
      "Alternate floor positions to build varied movement patterns."
    ],
    whenToCheckWithPediatrician: "If head lag or poor head control continues beyond expected range for age.",
    relatedKeywords: ["motor", "tummy time", "posture", "core strength"],
    sourceAuthority: CDC,
    sourceUrl: "https://www.cdc.gov/act-early/milestones/6-months.html"
  },
  {
    id: "joint-attention",
    title: "Joint Attention",
    subtitle: "Shared focus and learning",
    track: "development",
    primaryDomain: "social",
    minAgeMonths: 9,
    maxAgeMonths: 18,
    whyItMatters: "Following gaze, pointing, and shared attention support language and social understanding.",
    whatToLookFor: [
      "Looks where you point.",
      "Points or gestures to share interest.",
      "Alternates gaze between object and caregiver."
    ],
    tryAtHome: [
      "Name objects during shared looking moments.",
      "Use simple pointing games in daily routines.",
      "Celebrate all attempts to show or share."
    ],
    whenToCheckWithPediatrician: "If shared attention and social referencing remain limited by late toddler period.",
    relatedKeywords: ["joint attention", "pointing", "social communication", "language readiness"],
    sourceAuthority: AAP,
    sourceUrl: "https://www.healthychildren.org"
  },
  {
    id: "language-turn-taking",
    title: "Language Turn-Taking",
    subtitle: "Conversation foundations",
    track: "development",
    primaryDomain: "language",
    minAgeMonths: 6,
    maxAgeMonths: 24,
    whyItMatters: "Back-and-forth vocal exchange builds speech rhythm, listening, and expressive language growth.",
    whatToLookFor: [
      "Vocalizes in response to your voice.",
      "Uses varied sounds and attempts word-like patterns.",
      "Shows interest in songs, stories, and naming games."
    ],
    tryAtHome: [
      "Use short phrases and pause for response.",
      "Narrate daily routines with simple repeated words.",
      "Read picture books with pointing and naming."
    ],
    whenToCheckWithPediatrician: "If language progress seems stalled or hearing/language concerns persist.",
    relatedKeywords: ["speech", "language", "turn taking", "communication"],
    sourceAuthority: CDC,
    sourceUrl: "https://www.cdc.gov/act-early/milestones/"
  },
  {
    id: "executive-skills",
    title: "Attention and Self-Regulation",
    subtitle: "Cognitive readiness",
    track: "development",
    primaryDomain: "cognitive",
    minAgeMonths: 24,
    maxAgeMonths: 84,
    whyItMatters: "Early self-regulation helps learning, transitions, and behavior in home and school settings.",
    whatToLookFor: [
      "Improves focus during brief guided activities.",
      "Recovers from frustration with support.",
      "Begins to follow simple multi-step instructions."
    ],
    tryAtHome: [
      "Use predictable routines and transition cues.",
      "Break tasks into short, manageable steps.",
      "Model calm problem-solving language."
    ],
    whenToCheckWithPediatrician: "If persistent regulation, attention, or behavior concerns affect daily function.",
    relatedKeywords: ["attention", "self regulation", "executive function", "school readiness"],
    sourceAuthority: AAP,
    sourceUrl: "https://www.healthychildren.org"
  },
  {
    id: "heart-fitness",
    title: "Heart and Activity Rhythm",
    subtitle: "Cardiovascular health",
    track: "organ",
    primaryDomain: "motor",
    minAgeMonths: 24,
    maxAgeMonths: 216,
    whyItMatters: "Regular movement supports cardiovascular fitness, mood, sleep quality, and growth.",
    whatToLookFor: [
      "Comfortable play with age-appropriate stamina.",
      "Recovers normally after active play.",
      "Enjoys regular movement across the week."
    ],
    tryAtHome: [
      "Add daily active play blocks (outdoor or indoor).",
      "Use family movement games, dance, or walk routines.",
      "Pair activity with hydration and sleep consistency."
    ],
    whenToCheckWithPediatrician: "If exercise intolerance, unexplained fatigue, or breathing/chest symptoms are noted.",
    relatedKeywords: ["heart", "activity", "exercise", "fitness", "stamina"],
    sourceAuthority: AAP,
    sourceUrl: "https://www.healthychildren.org"
  },
  {
    id: "brain-sleep",
    title: "Brain and Sleep Architecture",
    subtitle: "Memory and restoration",
    track: "organ",
    primaryDomain: "cognitive",
    minAgeMonths: 3,
    maxAgeMonths: 216,
    whyItMatters: "Sleep supports memory consolidation, emotional regulation, and daytime learning.",
    whatToLookFor: [
      "Age-appropriate total sleep and wake windows.",
      "Gradual settling with routine cues.",
      "Daytime mood and attention linked with sleep quality."
    ],
    tryAtHome: [
      "Use consistent bedtime and wake-time anchors.",
      "Build a calming pre-sleep routine.",
      "Track sleep changes during growth phases."
    ],
    whenToCheckWithPediatrician: "If persistent sleep disruption affects feeding, behavior, or daytime functioning.",
    relatedKeywords: ["brain", "sleep", "memory", "routine", "regulation"],
    sourceAuthority: AAP,
    sourceUrl: "https://www.healthychildren.org"
  },
  {
    id: "lungs-breathing",
    title: "Lungs and Breathing Patterns",
    subtitle: "Respiratory resilience",
    track: "organ",
    primaryDomain: "motor",
    minAgeMonths: 1,
    maxAgeMonths: 216,
    whyItMatters: "Healthy breathing supports activity tolerance, sleep, and overall energy.",
    whatToLookFor: [
      "Comfortable breathing at rest and during routine play.",
      "Noisy breathing patterns only when expected (for example with cold) and resolving.",
      "Steady recovery after exertion."
    ],
    tryAtHome: [
      "Use smoke-free, clean-air home habits.",
      "Encourage playful breath control activities (blowing, songs).",
      "Monitor symptoms during seasonal changes."
    ],
    whenToCheckWithPediatrician: "If breathing effort, persistent cough, wheeze, or sleep breathing concerns are present.",
    relatedKeywords: ["lungs", "breathing", "cough", "wheeze", "air quality"],
    sourceAuthority: AAP,
    sourceUrl: "https://www.healthychildren.org"
  },
  {
    id: "vision-tracking",
    title: "Eyes and Visual Tracking",
    subtitle: "Vision-guided learning",
    track: "organ",
    primaryDomain: "cognitive",
    minAgeMonths: 2,
    maxAgeMonths: 216,
    whyItMatters: "Visual tracking supports attention, motor planning, and early learning activities.",
    whatToLookFor: [
      "Tracks people or objects smoothly across midline.",
      "Uses both eyes comfortably during play and reading.",
      "Sustains visual attention for age-appropriate periods."
    ],
    tryAtHome: [
      "Use tracking games with slow, predictable movement.",
      "Offer contrasting visual materials and varied distances.",
      "Balance screen use with active visual play."
    ],
    whenToCheckWithPediatrician: "If eye alignment, tracking, or visual attention concerns persist.",
    relatedKeywords: ["eyes", "vision", "tracking", "attention", "visual skills"],
    sourceAuthority: AAP,
    sourceUrl: "https://www.healthychildren.org"
  },
  {
    id: "hearing-language-link",
    title: "Ears and Hearing for Language",
    subtitle: "Listening to learning",
    track: "organ",
    primaryDomain: "language",
    minAgeMonths: 1,
    maxAgeMonths: 216,
    whyItMatters: "Hearing quality directly supports speech, language learning, and social responsiveness.",
    whatToLookFor: [
      "Turns toward familiar voices or sounds.",
      "Responds to name and simple verbal cues as expected for age.",
      "Shows progress in speech/language milestones."
    ],
    tryAtHome: [
      "Use clear face-to-face talking in quiet moments.",
      "Read aloud daily with expressive intonation.",
      "Reduce background noise during communication."
    ],
    whenToCheckWithPediatrician: "If speech or listening concerns suggest hearing should be evaluated.",
    relatedKeywords: ["hearing", "ears", "speech delay", "listening", "language"],
    sourceAuthority: CDC,
    sourceUrl: "https://www.cdc.gov/act-early/milestones/"
  },
  {
    id: "gut-and-feeding",
    title: "Digestion and Feeding Rhythm",
    subtitle: "Nutrition to growth",
    track: "organ",
    primaryDomain: "motor",
    minAgeMonths: 4,
    maxAgeMonths: 216,
    whyItMatters: "Feeding comfort and digestion patterns influence growth, behavior, and sleep.",
    whatToLookFor: [
      "Comfortable feeding progression for age.",
      "Regular stooling pattern without persistent distress.",
      "Steady growth trend over time."
    ],
    tryAtHome: [
      "Keep a short food and symptom log when concerns arise.",
      "Offer balanced textures and hydration for age.",
      "Use calm mealtime routines without pressure."
    ],
    whenToCheckWithPediatrician: "If poor intake, persistent vomiting, constipation, or growth concerns appear.",
    relatedKeywords: ["digestion", "feeding", "stool", "nutrition", "growth"],
    sourceAuthority: AAP,
    sourceUrl: "https://www.healthychildren.org"
  },
  {
    id: "skin-barrier",
    title: "Skin Barrier and Sensory Comfort",
    subtitle: "Protection and touch",
    track: "organ",
    primaryDomain: "social",
    minAgeMonths: 1,
    maxAgeMonths: 216,
    whyItMatters: "Skin health supports comfort, sleep, sensory tolerance, and daily wellbeing.",
    whatToLookFor: [
      "Skin remains generally comfortable between routine care.",
      "Sensitive areas are recognized early and protected.",
      "Touch tolerance improves with predictable routines."
    ],
    tryAtHome: [
      "Use gentle, fragrance-light skin care.",
      "Moisturize after bath if dryness is present.",
      "Track triggers (fabric, climate, products) when flare-ups occur."
    ],
    whenToCheckWithPediatrician: "If persistent rash, itch, infection signs, or sleep disruption from skin symptoms occur.",
    relatedKeywords: ["skin", "eczema", "sensitive skin", "sensory", "comfort"],
    sourceAuthority: AAP,
    sourceUrl: "https://www.healthychildren.org"
  },
  {
    id: "immune-resilience",
    title: "Immune Resilience Habits",
    subtitle: "Daily protection behaviors",
    track: "organ",
    primaryDomain: "general",
    minAgeMonths: 1,
    maxAgeMonths: 216,
    whyItMatters: "Day-to-day prevention habits support fewer disruptions and healthier recovery patterns.",
    whatToLookFor: [
      "Routine hand hygiene and sleep consistency.",
      "Recovery trends after common illness episodes.",
      "Vaccination and preventive care kept up to date."
    ],
    tryAtHome: [
      "Use regular handwashing routines tied to key moments.",
      "Prioritize sleep, nutrition, and hydration.",
      "Keep preventive care visits on schedule."
    ],
    whenToCheckWithPediatrician: "If frequent severe infections, poor recovery, or persistent immune concerns appear.",
    relatedKeywords: ["immune", "infection", "prevention", "vaccination", "recovery"],
    sourceAuthority: AAP,
    sourceUrl: "https://www.healthychildren.org"
  },
  {
    id: "kidney-hydration",
    title: "Kidneys and Hydration Balance",
    subtitle: "Fluid regulation",
    track: "organ",
    primaryDomain: "general",
    minAgeMonths: 6,
    maxAgeMonths: 216,
    whyItMatters: "Hydration and kidney function support energy, growth, and temperature regulation.",
    whatToLookFor: [
      "Regular urine output and age-appropriate hydration habits.",
      "No persistent signs of dehydration.",
      "Stable routine with fluid intake across active days."
    ],
    tryAtHome: [
      "Offer water regularly through the day as age-appropriate.",
      "Increase hydration awareness during heat or illness.",
      "Use visible water routines at school and home."
    ],
    whenToCheckWithPediatrician: "If persistent dehydration signs, painful urination, swelling, or urinary concerns occur.",
    relatedKeywords: ["kidney", "hydration", "urine", "fluid balance", "heat"],
    sourceAuthority: AAP,
    sourceUrl: "https://www.healthychildren.org"
  },
  {
    id: "movement-planning",
    title: "Movement Planning and Coordination",
    subtitle: "Body-to-brain integration",
    track: "development",
    primaryDomain: "motor",
    minAgeMonths: 12,
    maxAgeMonths: 144,
    whyItMatters: "Coordination and praxis support playground skills, handwriting readiness, and confidence.",
    whatToLookFor: [
      "Smooth transitions between movement tasks.",
      "Improving balance and bilateral coordination.",
      "Practice-driven gains over weeks."
    ],
    tryAtHome: [
      "Use obstacle courses and cross-body movement games.",
      "Break new tasks into short repeatable steps.",
      "Celebrate effort and consistency over speed."
    ],
    whenToCheckWithPediatrician: "If clumsiness, falls, or movement planning concerns persist and affect daily function.",
    relatedKeywords: ["coordination", "motor planning", "balance", "praxis", "play"],
    sourceAuthority: AAP,
    sourceUrl: "https://www.healthychildren.org"
  }
];

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function ageMidpointMonths(topic: BodyWonderTopic): number {
  return (topic.minAgeMonths + topic.maxAgeMonths) / 2;
}

function topicScore(topic: BodyWonderTopic, ageMonths: number, domain: string): number {
  const distance = Math.abs(ageMidpointMonths(topic) - ageMonths);
  const inBand = ageMonths >= topic.minAgeMonths && ageMonths <= topic.maxAgeMonths;
  const normalizedDomain = domain.trim().toLowerCase();

  let score = 0;
  if (inBand) {
    score += 38;
  } else if (distance <= 6) {
    score += 22;
  } else if (distance <= 18) {
    score += 12;
  } else {
    score += Math.max(2, 10 - Math.floor(distance / 12));
  }

  if (topic.primaryDomain === normalizedDomain) {
    score += 18;
  } else if (topic.primaryDomain === "general") {
    score += 6;
  }

  if (topic.track === "organ") {
    score += 4;
  }

  return score;
}

function rankTopics(ageMonths: number, domain: string): BodyWonderTopic[] {
  return [...TOPICS].sort((left, right) => {
    const scoreDelta = topicScore(right, ageMonths, domain) - topicScore(left, ageMonths, domain);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }
    return ageMidpointMonths(left) - ageMidpointMonths(right);
  });
}

function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function pickDailyFocus(input: {
  ageMonths: number;
  domain: string;
  uid?: string;
  date?: Date;
  offset?: number;
}): BodyWonderTopic | null {
  const ranked = rankTopics(input.ageMonths, input.domain);
  if (ranked.length === 0) {
    return null;
  }

  const activeDate = input.date ?? new Date();
  const hashInput = `${dayKey(activeDate)}|${input.uid ?? "guest"}|${input.domain}|${input.ageMonths}`;
  const base = stableHash(hashInput);
  const offset = Math.max(0, input.offset ?? 0);
  const index = (base + offset) % ranked.length;

  return ranked[index] ?? ranked[0] ?? null;
}

export function relatedFocusTopics(input: {
  ageMonths: number;
  domain: string;
  excludeId?: string;
  limit?: number;
}): BodyWonderTopic[] {
  const ranked = rankTopics(input.ageMonths, input.domain);
  const filtered = ranked.filter((topic) => topic.id !== input.excludeId);
  return filtered.slice(0, Math.max(1, input.limit ?? 3));
}

export function dailyFocusPrompt(topic: BodyWonderTopic, ageMonths: number): string {
  return [
    `Help me understand this daily focus for my ${ageMonths}-month child: ${topic.title}.`,
    `Topic type: ${topic.track}.`,
    `What to look for: ${topic.whatToLookFor.join(" ")}`,
    `Please give empathetic practical guidance, normal variation, home actions, and when to seek pediatric review.`
  ].join(" ");
}
