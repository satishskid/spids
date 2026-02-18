import { FivePartResponse } from "./responseFormatter";

export async function getAiResponse(
  question: string,
  milestoneContext: string
): Promise<FivePartResponse> {
  const providerUrl = process.env.AI_PROVIDER_URL;
  const providerKey = process.env.AI_PROVIDER_KEY;

  if (!providerUrl || !providerKey) {
    return {
      whatIsHappeningDevelopmentally:
        `Based on current milestones, this appears to be part of expected development. Context: ${milestoneContext}`,
      whatParentsMayNotice:
        "You may notice gradual changes in coordination, communication, and behavior over days to weeks.",
      whatIsNormalVariation:
        "Timing and intensity vary between children. Small differences are common.",
      whatToDoAtHome:
        "Use short, repeated, play-based routines and log observations in the timeline.",
      whenToSeekClinicalScreening:
        "Seek screening if there is sustained regression, persistent asymmetry, or loss of previously observed skills."
    };
  }

  const response = await fetch(providerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${providerKey}`
    },
    body: JSON.stringify({
      question,
      milestoneContext,
      responseFormat: "SKIDS_FIVE_PART"
    })
  });

  if (!response.ok) {
    throw new Error("AI provider request failed");
  }

  const data = (await response.json()) as FivePartResponse;
  return data;
}
