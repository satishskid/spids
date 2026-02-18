# Clinical Milestone Sources (SKIDS Parent)

Last reviewed: 2026-02-18

## Primary milestone checklist source
- CDC Learn the Signs. Act Early milestone pages (age-specific checklist references used in `web/src/data/verifiedMilestones.ts`):
  - https://www.cdc.gov/act-early/milestones/index.html

## AAP references (screening cadence and developmental surveillance)
- AAP clinical report summary: Promoting Optimal Development (developmental surveillance/screening framework):
  - https://pubmed.ncbi.nlm.nih.gov/34923824/
- AAP parent-facing milestones entry point (HealthyChildren.org):
  - https://www.healthychildren.org/English/ages-stages/Pages/default.aspx

## IAP and India-facing references
- Indian Pediatrics consensus/recommendations on developmental delay evaluation (IAP-associated publication context):
  - https://pubmed.ncbi.nlm.nih.gov/30101923/
- IAP Growth Charts portal (growth references used for context, not milestone checklist substitution):
  - https://iapgrowthcharts.in/

## Implementation notes
- UI milestone rows are currently derived from CDC age-banded milestones and tagged with source URL per row.
- AAP/IAP references are used to align screening framing and escalation language.
- Before clinical rollout, perform pediatric reviewer sign-off for local protocol adaptation.
