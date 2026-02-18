import { getFirestore } from "firebase-admin/firestore";

export interface MilestoneDoc {
  domain: string;
  age_min_months: number;
  age_max_months: number;
  milestone_title: string;
  development_process: string;
  observable_signs: string;
  normal_variation: string;
  home_actions: string;
  clinic_trigger: string;
}

export async function lookupMilestones(ageMonths: number, domain?: string): Promise<MilestoneDoc[]> {
  const db = getFirestore();
  let query = db
    .collection("milestones")
    .where("age_min_months", "<=", ageMonths)
    .where("age_max_months", ">=", ageMonths)
    .limit(6);

  if (domain) {
    query = query.where("domain", "==", domain);
  }

  const snap = await query.get();
  return snap.docs.map((doc) => doc.data() as MilestoneDoc);
}
