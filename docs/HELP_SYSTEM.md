# V1 Help system

The Help index at `/help` links to Guided Parts A–D, Quick Training, inference bootstrap, standalone inference, and runs/reports. Existing bookmarked topic routes remain available. Each topic has a table of contents and expandable sections with stable hash anchors. The `Open settings guide` buttons open the relevant section in a new tab with `noopener noreferrer`.

## Maintenance

User-facing copy lives in `src/pages/guideContent.ts`. Each `HelpGuide` contains ordered sections; a section has an `id`, title, short paragraphs, optional setting rows, and optional related topic keys. The page renderer and button live in `src/pages/HelpPages.tsx`.

To document a new setting:

1. Inspect the actual frontend label and request builder, then read the matching ML backend schema and implementation without changing either backend.
2. Add a row under the applicable section using the exact visible label. State accepted input, unit, confirmed default, effect, dependencies, an example, and likely validation mistake. If a field has no confirmed backend support, flag that in the guide rather than guessing.
3. For a new form section, add a stable section `id` and update `formGuideTargets` in `guideContent.ts`; use that target in the form's `GuideButton`. Links follow `/help/{topic}#{section-id}`.
4. Update `HelpPages.test.tsx` for representative behavior and verify all mapping targets exist. Add a focused form button test when a new stage is added.

Quick Training has its own short stage sections that link to the deeper Guided explanations. This keeps shared setting descriptions in one place. `formGuideTargets` covers the Guided stage buttons, all seven Quick steps, and inference. Topic routes are handled by the existing `/help/*` application route.

## Current limits

The guide is maintained by developers; its control inventory is explicit rather than generated from JSX. The mapping test catches missing target sections but cannot automatically detect every new conditional field inside a form. Recheck the editors when contracts change. Some controls inherit a backend default when omitted; the guide only quotes a number when it is confirmed by the frontend draft or backend schema. The app does not provide browser file upload, live training preview, or a Help search service.
