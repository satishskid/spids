import { initializeApp } from "firebase-admin/app";
import { askQuestion } from "./ai/askQuestion";
import { interpretCheckin } from "./ai/interpretCheckin";
import { createChildProfile } from "./profile/createChildProfile";
import { exportParentProfileSnapshot } from "./screening/exportParentProfileSnapshot";
import { importScreeningCredential } from "./screening/importScreeningCredential";
import { saveHomeScreening } from "./screening/saveHomeScreening";
import { validateImport } from "./screening/validateImport";
import { getDevelopmentTimeline } from "./timeline/getDevelopmentTimeline";

initializeApp();

export {
  createChildProfile,
  askQuestion,
  interpretCheckin,
  saveHomeScreening,
  getDevelopmentTimeline,
  exportParentProfileSnapshot,
  importScreeningCredential,
  validateImport
};
