import { describe, expect, it } from "vitest";
import { enforceMedicalSafety } from "../src/utils/medicalSafety";
import { formatFivePartResponse } from "../src/utils/responseFormatter";

describe("medical safety and response format", () => {
  it("blocks medically unsafe request language", () => {
    expect(() => enforceMedicalSafety("Can you prescribe medication?")).toThrow();
  });

  it("allows safe developmental questions", () => {
    expect(() => enforceMedicalSafety("How can I support motor development at home?")).not.toThrow();
  });

  it("always returns complete five-part response keys", () => {
    const formatted = formatFivePartResponse({
      whatIsHappeningDevelopmentally: "",
      whatParentsMayNotice: "",
      whatIsNormalVariation: "",
      whatToDoAtHome: "",
      whenToSeekClinicalScreening: ""
    });

    expect(formatted.whatIsHappeningDevelopmentally.length).toBeGreaterThan(0);
    expect(formatted.whatParentsMayNotice.length).toBeGreaterThan(0);
    expect(formatted.whatIsNormalVariation.length).toBeGreaterThan(0);
    expect(formatted.whatToDoAtHome.length).toBeGreaterThan(0);
    expect(formatted.whenToSeekClinicalScreening.length).toBeGreaterThan(0);
  });
});
