export interface DiscoveryJourneyModule {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  wonderFact: string;
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  difficulty: "Beginner" | "Explorer" | "Expert";
  minMonths: number;
  maxMonths: number;
  featured?: boolean;
}

const DISCOVERY_MODULES: DiscoveryJourneyModule[] = [
  {
    id: "heart",
    title: "The Amazing Heart",
    subtitle: "Your Child's Powerful Engine",
    description: "Discover how the heart pumps life through every growing organ.",
    wonderFact: "A child's heart beats around 100,000 times every day.",
    emoji: "❤️",
    gradientFrom: "#ef4444",
    gradientTo: "#db2777",
    difficulty: "Beginner",
    minMonths: 0,
    maxMonths: 216,
    featured: true
  },
  {
    id: "brain",
    title: "The Incredible Brain",
    subtitle: "The Universe in Their Head",
    description: "Understand brain growth, neural wiring, and thinking development.",
    wonderFact: "Early childhood forms rapid neural connections every second.",
    emoji: "🧠",
    gradientFrom: "#8b5cf6",
    gradientTo: "#4f46e5",
    difficulty: "Explorer",
    minMonths: 0,
    maxMonths: 216,
    featured: true
  },
  {
    id: "lungs",
    title: "Amazing Lungs",
    subtitle: "The Breath of Life",
    description: "Learn how breathing supports growth, energy, and resilience.",
    wonderFact: "Healthy lungs deliver oxygen to every active cell.",
    emoji: "🫁",
    gradientFrom: "#06b6d4",
    gradientTo: "#2563eb",
    difficulty: "Beginner",
    minMonths: 0,
    maxMonths: 216
  },
  {
    id: "digestive",
    title: "The Food Factory",
    subtitle: "Amazing Digestion Journey",
    description: "Track how food becomes fuel for development, immunity, and focus.",
    wonderFact: "Digestion is a full-body process linked to mood and growth.",
    emoji: "🍎",
    gradientFrom: "#22c55e",
    gradientTo: "#059669",
    difficulty: "Explorer",
    minMonths: 0,
    maxMonths: 216,
    featured: true
  },
  {
    id: "eyes",
    title: "Amazing Eyes",
    subtitle: "Windows to the World",
    description: "Explore visual milestones and how children interpret what they see.",
    wonderFact: "Vision skills and brain processing develop together.",
    emoji: "👁️",
    gradientFrom: "#f59e0b",
    gradientTo: "#ea580c",
    difficulty: "Beginner",
    minMonths: 0,
    maxMonths: 216
  },
  {
    id: "ears",
    title: "Super Ears",
    subtitle: "The Sound Detectives",
    description: "Decode hearing, balance, and language foundations from sound input.",
    wonderFact: "Hearing quality strongly shapes speech and learning outcomes.",
    emoji: "👂",
    gradientFrom: "#10b981",
    gradientTo: "#0f766e",
    difficulty: "Beginner",
    minMonths: 0,
    maxMonths: 216
  },
  {
    id: "skin",
    title: "Super Skin",
    subtitle: "Your Body's Shield",
    description: "See how skin protects, signals health status, and supports immunity.",
    wonderFact: "Skin is the largest organ and an important health signal board.",
    emoji: "🛡️",
    gradientFrom: "#fb923c",
    gradientTo: "#f59e0b",
    difficulty: "Beginner",
    minMonths: 0,
    maxMonths: 216
  },
  {
    id: "muscles-bones",
    title: "Muscles & Bones",
    subtitle: "The Mover and Shaker",
    description: "Understand strength, posture, balance, and movement foundations.",
    wonderFact: "Motor milestones depend on muscle tone and skeletal coordination.",
    emoji: "🦴",
    gradientFrom: "#f97316",
    gradientTo: "#ef4444",
    difficulty: "Explorer",
    minMonths: 0,
    maxMonths: 216
  },
  {
    id: "immune",
    title: "Immune Heroes",
    subtitle: "The Body Guards",
    description: "Teach children why prevention, sleep, and nutrition protect health.",
    wonderFact: "Immune memory helps the body respond faster over time.",
    emoji: "⚔️",
    gradientFrom: "#3b82f6",
    gradientTo: "#7c3aed",
    difficulty: "Expert",
    minMonths: 60,
    maxMonths: 216
  },
  {
    id: "kidneys",
    title: "The Filtration Station",
    subtitle: "Super Cleaners",
    description: "Discover hydration, filtration, and fluid balance in child health.",
    wonderFact: "Kidneys continuously clean blood and regulate fluid balance.",
    emoji: "🫧",
    gradientFrom: "#f59e0b",
    gradientTo: "#f97316",
    difficulty: "Explorer",
    minMonths: 48,
    maxMonths: 216
  },
  {
    id: "hormones",
    title: "The Hormone Orchestra",
    subtitle: "Growth Signal Network",
    description: "Understand endocrine signals shaping growth, mood, and puberty.",
    wonderFact: "Hormones coordinate body systems like an internal orchestra.",
    emoji: "🧪",
    gradientFrom: "#a855f7",
    gradientTo: "#ec4899",
    difficulty: "Expert",
    minMonths: 72,
    maxMonths: 216
  },
  {
    id: "senses",
    title: "The Senses Studio",
    subtitle: "How Children Perceive the World",
    description: "Learn how sensory processing supports regulation and learning.",
    wonderFact: "Sensory integration influences focus, mood, and movement quality.",
    emoji: "✨",
    gradientFrom: "#06b6d4",
    gradientTo: "#7c3aed",
    difficulty: "Explorer",
    minMonths: 24,
    maxMonths: 216
  },
  {
    id: "movement",
    title: "Movement Lab",
    subtitle: "Balance, Coordination, Confidence",
    description: "Explore coordination and movement confidence through playful practice.",
    wonderFact: "Movement quality is deeply linked to learning readiness.",
    emoji: "🏃",
    gradientFrom: "#0ea5e9",
    gradientTo: "#14b8a6",
    difficulty: "Explorer",
    minMonths: 24,
    maxMonths: 216
  },
  {
    id: "language",
    title: "Language Builder",
    subtitle: "From Sounds to Meaning",
    description: "Decode speech, comprehension, and communication growth steps.",
    wonderFact: "Language develops through listening, interaction, and repetition.",
    emoji: "🗣️",
    gradientFrom: "#6366f1",
    gradientTo: "#9333ea",
    difficulty: "Explorer",
    minMonths: 12,
    maxMonths: 216
  },
  {
    id: "learning",
    title: "The Learning Machine",
    subtitle: "Cognitive Development & Thinking",
    description: "Translate attention, memory, and executive function into home actions.",
    wonderFact: "Sleep and emotional safety improve learning consolidation.",
    emoji: "📘",
    gradientFrom: "#7c3aed",
    gradientTo: "#4f46e5",
    difficulty: "Explorer",
    minMonths: 24,
    maxMonths: 216,
    featured: true
  },
  {
    id: "emotions",
    title: "Emotion Compass",
    subtitle: "Regulation, Resilience, Connection",
    description: "Help parents coach emotional literacy and self-regulation skills.",
    wonderFact: "Emotion coaching supports behavior and long-term resilience.",
    emoji: "💛",
    gradientFrom: "#f97316",
    gradientTo: "#ec4899",
    difficulty: "Explorer",
    minMonths: 24,
    maxMonths: 216
  }
];

const DOMAIN_HINTS: Record<string, string[]> = {
  motor: ["muscles-bones", "movement", "lungs", "heart"],
  language: ["language", "ears", "brain", "senses"],
  social: ["emotions", "learning", "brain", "senses"],
  cognitive: ["brain", "learning", "language", "senses"],
  general: ["heart", "brain", "digestive", "learning"]
};

export function pickDiscoveryModules(domain: string, ageMonths: number, limit = 6): DiscoveryJourneyModule[] {
  const hints = DOMAIN_HINTS[domain] ?? DOMAIN_HINTS.general;
  return [...DISCOVERY_MODULES]
    .map((module) => {
      const inAgeWindow = ageMonths >= module.minMonths && ageMonths <= module.maxMonths;
      const domainBoost = hints.includes(module.id) ? 5 : 0;
      const featuredBoost = module.featured ? 2 : 0;
      const ageBoost = inAgeWindow ? 4 : -1;
      const difficultyBias = module.difficulty === "Beginner" && ageMonths < 30 ? 2 : 0;
      const score = domainBoost + featuredBoost + ageBoost + difficultyBias;
      return { module, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.module);
}

export function allDiscoveryModules(): DiscoveryJourneyModule[] {
  return DISCOVERY_MODULES;
}
