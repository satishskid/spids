import { HttpsError } from "firebase-functions/v2/https";

const bannedPhrases = [
  "diagnosis",
  "medication",
  "prescribe",
  "emergency treatment",
  "lab result interpretation"
];

export function enforceMedicalSafety(text: string): void {
  const lowered = text.toLowerCase();
  for (const phrase of bannedPhrases) {
    if (lowered.includes(phrase)) {
      throw new HttpsError(
        "failed-precondition",
        "Request violates SKIDS medical safety policy"
      );
    }
  }
}
