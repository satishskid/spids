# Tomorrow UI + Chat Polish Brief

Date prepared: 2026-02-18

## Goal
Polish the product so it feels calm, engaging, and trustworthy while preserving medical safety and clarity.

Focus areas for next session:
1. Visual calm/trust polish for the main experience.
2. Chat section UX polish for high-confidence parent guidance.

## Constraints (Non-negotiable)
- Milestone content must remain age-banded and clinically sourced.
- Chat must remain educational, not diagnostic.
- Accessibility target: WCAG 2.2 AA baseline for key flows.
- Mobile-first behavior must be clean and stable.

## Evidence-backed design principles to apply

### Tone and trust language
- Use calm, factual, reassuring language; avoid patronizing wording.
- Prefer plain English and short sentences, especially in high-anxiety moments.
- Explain medical terms if used.

### Health communication clarity
- Reduce jargon and use everyday words where possible.
- Provide explicit next-step actions and clear escalation language.

### AI trust in healthcare context
- Show clear role boundaries: AI guidance + human clinician oversight for serious concerns.
- For sensitive scenarios, include stronger “when to seek care” visibility.

### Accessibility
- Ensure visible focus states and no obscured focused controls.
- Ensure explicit input error text and correction guidance.
- Keep contrast robust for all essential text and controls.

## Product direction for next session

### A) Calm/engaging/trusting UI polish

#### 1) Visual system refinement
- Introduce a tighter token set:
  - `--surface-0/1/2`
  - `--text-primary/secondary`
  - `--brand-warm`, `--brand-calm`
  - semantic: `--success`, `--warning`, `--critical`
- Reduce heavy borders/shadows where they feel harsh.
- Increase whitespace rhythm and section separation.
- Keep one clear accent color per domain; avoid noisy gradients.

#### 2) Information hierarchy cleanup
- Primary surfaces only:
  - Milestone wall
  - Featured blog + search
  - Chat
- Keep occasional tools collapsed and visually quieter.
- Reduce repeated labels and “system” language on parent-facing screens.

#### 3) Milestone wall polish
- Make major milestones visually dominant (thicker line + stronger bead).
- Minor milestones should be visible but lighter.
- Keep current age marker persistent and obvious.
- Improve row density so wall does not feel empty around child age window.

#### 4) Trust cues in UI
- Keep source attribution visible in milestone sheet.
- Add “educational guidance” disclaimer in subdued form near actions.
- Keep clinical escalation action legible (not hidden in long text).

### B) Chat section polish

#### 1) Conversation readability
- Make assistant bubbles slightly narrower with improved line-height.
- Convert long 5-part output into collapsible/structured cards per section.
- Keep one-line summary at top of each assistant response.

#### 2) Smart prompting and flow
- Add better quick chips by context:
  - “Is this within normal variation?”
  - “What can I do this week?”
  - “When should I seek screening?”
- On milestone click, prefill contextual prompt and auto-focus composer.

#### 3) Safety + confidence UX
- Add subtle “Not for diagnosis” hint in chat header/footer.
- Highlight “when to seek care” part with higher visual prominence.
- For urgent keywords, elevate escalation copy before full response.

#### 4) Per-message trust metadata
- Add compact footer meta for assistant messages:
  - `Context: age/domain`
  - `Source set: CDC + AAP/IAP screening cadence`
- Avoid overloading each message with long disclaimers.

## Implementation plan (next session)

### Phase 1 (fast wins, 60-90 min)
- Polish token palette + spacing scale.
- Soften cards/borders and improve chat typography.
- Improve milestone density and major/minor visual contrast.

### Phase 2 (chat UX, 60-90 min)
- Structured assistant response cards.
- Context-aware suggestion chips.
- Stronger escalation and safety hints.

### Phase 3 (quality pass, 45-60 min)
- Mobile viewport pass (wall, blogs, chat composer).
- Accessibility checks: focus, contrast, form errors.
- Final copy tightening for parent-friendly voice.

## Definition of done
- Parent can understand the screen in 5 seconds (wall/blog/chat priorities obvious).
- Chat response is scannable without reading large text blocks.
- Milestone click -> chat feels immediate and contextual.
- UI feels medically credible without feeling cold/clinical.
- No empty-feeling wall around active age when data exists.

## References used
- NHS voice and tone: https://service-manual.nhs.uk/content/voice-and-tone
- NHS how we write: https://service-manual.nhs.uk/content/how-we-write
- W3C WCAG 2.2 Quick Reference: https://www.w3.org/WAI/WCAG22/quickref/
- CDC Clear Communication Index: https://www.cdc.gov/ccindex/index.html
- CDC Everyday Words: https://www.cdc.gov/ccindex/everydaywords/about.html
- AHRQ health literacy resources: https://www.ahrq.gov/evidencenow/tools/health-literacy.html
- NIST AI RMF: https://www.nist.gov/itl/ai-risk-management-framework
- FDA CDS guidance (Jan 2026): https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software
- Google conversation components: https://developers.google.com/assistant/conversation-design/conversational-components-overview
- BMJ Digital Health trust survey (2024 cohort): https://bmjdigitalhealth.bmj.com/content/1/1/e000090
- IJHCS trust in diagnostic chatbots: https://www.sciencedirect.com/science/article/pii/S1071581922000751

## Note
BMJ page was partially blocked in crawler open mode, but key findings were captured from indexed abstract/search metadata and aligned with peer-reviewed trust patterns.
