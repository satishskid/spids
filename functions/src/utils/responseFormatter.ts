export interface FivePartResponse {
  whatIsHappeningDevelopmentally: string;
  whatParentsMayNotice: string;
  whatIsNormalVariation: string;
  whatToDoAtHome: string;
  whenToSeekClinicalScreening: string;
}

export function formatFivePartResponse(input: FivePartResponse): FivePartResponse {
  const fallback = "Not enough context yet. Continue observing and tracking changes.";
  return {
    whatIsHappeningDevelopmentally: input.whatIsHappeningDevelopmentally || fallback,
    whatParentsMayNotice: input.whatParentsMayNotice || fallback,
    whatIsNormalVariation: input.whatIsNormalVariation || fallback,
    whatToDoAtHome: input.whatToDoAtHome || fallback,
    whenToSeekClinicalScreening: input.whenToSeekClinicalScreening || fallback
  };
}
