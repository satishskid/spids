import { describe, expect, it } from "vitest";
import {
  validateParentProfileExport,
  validateScreeningImport
} from "../src/screening/schemaValidators";

describe("json interoperability schemas", () => {
  it("accepts valid parent profile export", () => {
    const payload = {
      childId: "parentA",
      ageMonths: 36,
      developmentSummary: { motor: "progressing" },
      recentObservations: [],
      homeScreeningHistory: []
    };

    expect(validateParentProfileExport(payload)).toBe(true);
  });

  it("rejects invalid parent profile export", () => {
    const payload = {
      ageMonths: 36,
      developmentSummary: {}
    };

    expect(validateParentProfileExport(payload)).toBe(false);
    expect(validateParentProfileExport.errors?.length ?? 0).toBeGreaterThan(0);
  });

  it("accepts valid screening import payload", () => {
    const payload = {
      credentialType: "SKIDS_HEAD_TO_TOE",
      assessmentDate: "2026-02-18",
      clinicId: "clinic-01",
      version: "1.0",
      riskFlags: []
    };

    expect(validateScreeningImport(payload)).toBe(true);
  });

  it("rejects invalid screening import payload", () => {
    const payload = {
      credentialType: "SKIDS_HEAD_TO_TOE",
      clinicId: "clinic-01"
    };

    expect(validateScreeningImport(payload)).toBe(false);
    expect(validateScreeningImport.errors?.length ?? 0).toBeGreaterThan(0);
  });
});
