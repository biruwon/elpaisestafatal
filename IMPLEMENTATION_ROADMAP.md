# Implementation Roadmap v1.0

## Status

Ready for implementation

---

# 1. Purpose

This roadmap translates the approved product specifications for El País Está Fatal into concrete implementation milestones for the existing Astro codebase.

The roadmap should be used together with the detailed product specifications. It does not replace them.

The implementation should prioritise:

* A useful first version over architectural perfection.
* Static Astro pages over databases or runtime APIs.
* Reusing existing content and data.
* Mobile-first design.
* Visual explanations.
* Popular claims as the primary entry point.
* Incremental delivery through independently testable milestones.

---

# 2. Product Specification References

The following files define the approved product direction:

* Product vision: [`plans/product-vision.md`](./plans/product-vision.md)
* Homepage: [`plans/homepage.md`](./plans/homepage.md)
* Claim page: [`plans/claim-page.md`](./plans/claim-page.md)
* Popular claims: [`plans/popular-claims-page.md`](./plans/popular-claims-page.md)
* Topic page: [`plans/topic-page.md`](./plans/topic-page.md)
* Sharing system: [`plans/sharing-system.md`](./plans/sharing-system.md)
* Visual design system: [`plans/visual-design-system.md`](./plans/visual-design-system.md)
* Information architecture: [`plans/information-architecture-spec.md`](./plans/information-architecture-spec.md)

When the roadmap and a detailed specification appear to conflict, the detailed specification takes priority unless the roadmap explicitly records a later implementation decision.

---

# 3. Existing Project Structure

The project already uses Astro with statically authored TypeScript data.

Relevant existing files include:

```text
src/
├── data/
│   ├── claims.ts
│   ├── concernComparison.ts
│   ├── concerns.ts
│   ├── epistemic.ts
│   ├── evidenceCauses.ts
│   ├── investigations/
│   ├── provenance.ts
│   ├── quickAnswers.ts
│   ├── regions.ts
│   ├── revisions.ts
│   └── search.ts
├── layouts/
│   └── BaseLayout.astro
└── pages/
    ├── acerca-de.astro
    ├── contacto.astro
    ├── fuentes.astro
    ├── index.astro
    ├── metodologia.astro
    ├── privacidad.astro
    ├── revisiones.astro
    ├── preocupaciones/
    │   └── [slug].astro
    └── verificaciones/
        ├── index.astro
        └── [slug].astro
```

Existing scripts include:

```text
scripts/audit-investigations.mjs
scripts/calculate-concerns.mjs
scripts/generate-social-cards.mjs
```

Existing commands:

```bash
npm run dev
npm run build
npm run check
npm run audit:investigations
npm run calculate:concerns
npm run cards
```

---

# 4. Architectural Decisions

## 4.1 Static-first

The MVP remains fully static.

Do not introduce:

* A database.
* A CMS.
* User accounts.
* Server-side claim generation.
* Runtime AI calls.
* Automatic public-debate monitoring.

Content continues to live in TypeScript data files and Astro pages.

---

## 4.2 Reuse the existing data structure

Do not migrate all content to MDX or a new content system during the MVP.

Use the current files:

* `claims.ts` for claim metadata and content.
* `concerns.ts` for topics.
* `investigations/*.ts` for deep investigations.
* `search.ts` for static search.
* `provenance.ts` and `revisions.ts` for traceability.
* `quickAnswers.ts`, `epistemic.ts` and `evidenceCauses.ts` where they already support claim explanations.

Only change these structures when a concrete page requirement cannot be implemented cleanly with the current model.

---

## 4.3 Claim terminology and routes

The product terminology is:

> Afirmaciones

The existing implementation uses:

> Verificaciones

Target route:

```text
/afirmaciones/[slug]
```

Existing URLs should continue working through permanent redirects:

```text
/verificaciones/[slug] → /afirmaciones/[slug]
/verificaciones → relevant homepage section or future index
```

If route migration creates unnecessary risk for the first milestone, the UI terminology may change before the URLs. The route migration can then occur in a later milestone.

---

## 4.4 Topic routes

Keep the existing route for the MVP:

```text
/preocupaciones/[slug]
```

Changing this to `/temas/[slug]` provides limited immediate value and risks breaking existing URLs.

The public UI may use the word:

> Temas

while existing URLs remain unchanged.

---

## 4.5 Progressive enhancement

Core content and navigation must work without client-side JavaScript.

JavaScript may enhance:

* Search autocomplete.
* Sharing.
* Copying responses.
* Expanding investigations.
* Downloading social cards.

---

# 5. Delivery Strategy

Implementation is divided into milestones.

Each milestone must:

1. Build successfully.
2. Pass `astro check`.
3. Work on mobile and desktop.
4. Be independently reviewable.
5. Avoid combining unrelated refactors.
6. Preserve existing published content unless explicitly changed.

Recommended implementation order:

```text
Milestone 0 — Baseline and inventory
Milestone 1 — Design foundations
Milestone 2 — Shared layout and navigation
Milestone 3 — Homepage
Milestone 4 — Claim pages
Milestone 5 — Topic pages
Milestone 6 — Sharing system
Milestone 7 — Search and discovery
Milestone 8 — SEO and metadata
Milestone 9 — Accessibility and performance
Milestone 10 — Content preparation and launch
```

---

# 6. Milestone 0 — Baseline and Inventory

## Goal

Establish a stable baseline before changing the product.

## Specifications

* [`plans/product-vision.md`](./plans/product-vision.md)
* All other specifications for context.

## Tasks

### 6.1 Verify the current project

Run:

```bash
npm install
npm run check
npm run build
npm run audit:investigations
```

Record any existing errors before making changes.

### 6.2 Capture the current route inventory

Document all generated pages:

* Homepage.
* Topic pages.
* Claim or verification pages.
* Source and methodology pages.
* Revision pages.
* CSV endpoints.

### 6.3 Inventory existing claim content

Review:

```text
src/data/claims.ts
src/data/quickAnswers.ts
src/data/epistemic.ts
src/data/evidenceCauses.ts
```

For every existing claim, record whether it already contains:

* Title.
* Short answer.
* Verdict.
* Main visual.
* Key facts.
* Misconceptions.
* Competing explanations.
* Related claims.
* Deep investigation reference.
* Shareable response.
* Social card.

Do not redesign the data model during this task. Identify gaps only.

### 6.4 Inventory existing topic content

Review:

```text
src/data/concerns.ts
src/data/investigations/*.ts
src/data/concernComparison.ts
```

For every concern, identify:

* Main question.
* Current summary.
* Key findings.
* Existing charts.
* Existing timeline data.
* Associated claims.
* Existing illustration.

### 6.5 Create screenshots

Capture current mobile and desktop versions of:

* Homepage.
* One topic page.
* One claim page.
* Header and footer.

These screenshots provide a visual baseline for comparison.

## Deliverables

* Baseline build passes or known issues are documented.
* Content-gap checklist.
* Route inventory.
* Before screenshots.

## Acceptance Criteria

* Existing failures are distinguished from new failures.
* No production behaviour has changed.
* The team understands what content can be reused.

---

# 7. Milestone 1 — Visual Design Foundations

## Goal

Implement the shared visual language before rebuilding individual pages.

## Specifications

* [`plans/visual-design-system.md`](./plans/visual-design-system.md)
* [`plans/product-vision.md`](./plans/product-vision.md)

## Tasks

### 7.1 Define global design tokens

Add or consolidate tokens for:

* Backgrounds.
* Text.
* Muted text.
* Borders.
* Surface colours.
* Focus states.
* Spacing.
* Radius.
* Shadows.
* Content widths.
* Typography scale.

Recommended implementation:

```text
src/styles/global.css
```

If global styles currently live elsewhere, consolidate without unnecessary rewrites.

### 7.2 Define topic identity tokens

Create a static map for:

* Topic colour.
* Topic icon.
* Topic label.
* Illustration path.

Possible location:

```text
src/data/topicPresentation.ts
```

Colours identify topics, not severity.

### 7.3 Select typography

Use no more than:

* One primary font family.
* One optional display or accent family.

Prefer locally reliable or privacy-conscious loading.

Define:

* Page title.
* Section title.
* Card title.
* Body.
* Caption.
* Label.

### 7.4 Add outline icons

Choose one consistent outline icon library or use a small set of local SVG components.

Requirements:

* Consistent stroke width.
* Accessible labels where meaningful.
* Decorative icons hidden from screen readers.
* No emoji as permanent UI icons.

### 7.5 Define shared surfaces

Create reusable visual primitives for:

* Card surface.
* Topic label.
* Section heading.
* Primary link or button.
* Secondary link.
* Callout.
* Expandable area.
* Share action.

Possible components:

```text
src/components/ui/Card.astro
src/components/ui/TopicBadge.astro
src/components/ui/SectionHeader.astro
src/components/ui/ActionLink.astro
src/components/ui/ExpandableSection.astro
```

Do not overbuild a generic component library. Extract only patterns used by approved pages.

### 7.6 Establish illustration guidelines

Create prompts or generation rules for future topic illustrations:

* Consistent aspect ratio.
* Consistent artistic style.
* No embedded text.
* No political party branding.
* No stereotypes.
* No emotionally manipulative imagery.
* Suitable cropping on mobile and desktop.

Generate illustrations only after the style is approved with two or three representative topics.

### TODO — generate topic illustrations in a separate session

Do not generate these assets in the implementation session. The other session should create one square PNG for each path below, preserving the shared style and using the topic-specific prompt. Save the final files under `public/images/topics/`:

Common prompt prefix for every asset:

```text
Use case: illustration-story. Asset type: square editorial web illustration for a Spanish public-interest data investigation. Flat screen-print collage with simple geometric shapes, tactile paper grain, warm cream paper background, deep blue, muted ochre, one restrained red accent, thoughtful and analytical rather than alarmist. No readable text, no logos, no flags, no political party branding, no stereotypes, no watermarks, no photorealism, no decorative UI, no embedded chart labels. Keep the central subject clear with generous negative space and crisp edges; suitable for desktop and mobile cropping. The illustration is secondary to evidence and must not imply that the topic is inherently good or bad.
```

Topic-specific prompts and required paths:

| Path | Add this subject to the common prefix |
|---|---|
| `public/images/topics/politica.png` | A civic square with several abstract speech panels, a parliament-like building in the distance, and a balanced scale motif suggesting institutions and accountability. No party colours or politicians. |
| `public/images/topics/vivienda.png` | A dense apartment block, a small house key and a restrained rising price line, suggesting access and affordability without depicting homelessness. |
| `public/images/topics/empleo.png` | A worker at a crossroads between a training workshop and a modern workplace, with a subtle ladder or bridge motif suggesting opportunity and progression. |
| `public/images/topics/inmigracion.png` | Diverse silhouettes moving along a bridge from a rural landscape toward a city, suggesting routes, work and integration without boats, borders or threat imagery. |
| `public/images/topics/sanidad.png` | A public clinic with a clock, a waiting-room pathway and a small medical cross, suggesting access and waiting times without showing distress or illness. |
| `public/images/topics/economia.png` | A household table connected to a factory, shop and transport line, with simple coins and arrows suggesting production, prices and living standards. |
| `public/images/topics/corrupcion.png` | Public contract papers, a courthouse column and two hands separated by a transparent barrier, suggesting oversight without literal bribes or named officials. |
| `public/images/topics/juventud.png` | A young adult with a backpack facing several doors labelled only by visual symbols for study, work, housing and independence; no text in the image. |
| `public/images/topics/seguridad.png` | An ordinary urban street with lighting, a phone showing an abstract shield, and a clear public route, suggesting both street and digital safety without weapons. |
| `public/images/topics/impuestos.png` | A receipt, household budget and public-service building connected by measured lines, suggesting the fiscal contract without partisan symbolism. |
| `public/images/topics/desigualdad.png` | A set of unequal steps or platforms with different starting points, plus education, housing and healthcare symbols, suggesting unequal opportunity without caricaturing poverty. |
| `public/images/topics/extremismos.png` | A divided public conversation represented by branching speech shapes and a narrow bridge between them, suggesting polarization and democratic limits without extremist symbols. |
| `public/images/topics/problemas-sociales.png` | Interlocking neighbourhood homes, care hands and a shared public bench, suggesting cohesion, care and exclusion without depicting identifiable vulnerable people. |
| `public/images/topics/crisis-valores.png` | A compass, shared street and several diverging paths, suggesting civic norms and uncertainty without presenting a moral judgement as fact. |

Generation acceptance checklist: all 14 files exist, PNG dimensions are square, no asset contains readable text, style and palette are coherent, crops remain legible at 320 px, and each image has a meaningful page-level alternative description or is marked decorative when it adds no factual information. After copying the files, replace the temporary card fallback in the topic hero and run `npm run build`, `npm run audit:roadmap` and `git diff --check`.

## Deliverables

* Global visual tokens.
* Topic colour and icon mapping.
* Shared UI primitives.
* Initial illustration direction.

## Acceptance Criteria

* A test page demonstrates the approved visual identity.
* Components work at 320 px width.
* Topic identity is recognisable without implying severity.
* The design feels like a modern explainer and data-storytelling product.

---

# 8. Milestone 2 — Shared Layout and Navigation

## Goal

Update the global site structure according to the approved information architecture.

## Specifications

* [`plans/information-architecture-spec.md`](./plans/information-architecture-spec.md)
* [`plans/visual-design-system.md`](./plans/visual-design-system.md)

## Tasks

### 8.1 Refactor `BaseLayout.astro`

Update:

```text
src/layouts/BaseLayout.astro
```

It should support:

* Page title.
* Meta description.
* Canonical URL.
* Social image.
* Topic colour where relevant.
* Header variant.
* Breadcrumb slot.
* Main content.
* Minimal footer.

### 8.2 Simplify the header

Primary navigation:

* Inicio.
* Buscar.
* Acerca de.

Desktop:

* Visible search control or search entry point.

Mobile:

* Compact navigation.
* Search icon or button.
* No complex dropdown.

### 8.3 Simplify the footer

Show:

* Acerca de.
* Contacto, merged into the About page or represented as a section/link.
* Privacy where legally appropriate.

Do not promote methodology or sources in the global footer.

The existing methodology and source pages may remain accessible through contextual links.

### 8.4 Merge About and Contact

Update:

```text
src/pages/acerca-de.astro
```

Add contact information or a contact section.

Then either:

* Redirect `/contacto` to `/acerca-de#contacto`, or
* Keep `/contacto` temporarily but remove it from primary navigation.

### 8.5 Implement breadcrumbs

Create:

```text
src/components/navigation/Breadcrumbs.astro
```

Topic:

```text
Inicio > Inmigración
```

Claim:

```text
Inicio > Inmigración > ¿La inmigración aumenta la delincuencia?
```

For cross-topic claims, use the primary topic in the breadcrumb and expose secondary topics elsewhere.

### 8.6 Add topic navigation

Create a reusable all-topics navigation block for the end of Topic and Claim Pages.

## Deliverables

* Updated base layout.
* Simplified navigation.
* Breadcrumb component.
* Minimal footer.
* Merged About and Contact experience.

## Acceptance Criteria

* Navigation works without JavaScript.
* Header remains usable at 320 px.
* Breadcrumbs match the primary topic.
* No route becomes inaccessible unintentionally.

---

# 9. Milestone 3 — Homepage Rebuild

## Goal

Make the homepage answer:

> ¿España está fatal o no?

Popular claims become the primary entry point. The 14 concerns remain the secondary exploration path.

## Specifications

* [`plans/homepage.md`](./plans/homepage.md)
* [`plans/popular-claims-page.md`](./plans/popular-claims-page.md)
* [`plans/visual-design-system.md`](./plans/visual-design-system.md)
* [`plans/information-architecture-spec.md`](./plans/information-architecture-spec.md)

## Main File

```text
src/pages/index.astro
```

## Tasks

### 9.1 Rebuild the hero

The hero should communicate:

* España está fatal.
* ¿O no?
* The site examines what the data actually show.

Avoid a long introduction.

Include a strong visual or topic illustration without competing with the main message.

### 9.2 Add guided search

For the MVP, search is not an open AI question box.

It should:

* Search existing published claims.
* Search topics.
* Display suggestions immediately.
* Show popular claims when empty or focused.
* Never imply that arbitrary questions can be answered.

Use the existing:

```text
src/data/search.ts
```

Extend it only as needed.

### 9.3 Add `Afirmaciones populares`

Create:

```text
src/data/popularClaims.ts
```

Or adapt an existing appropriate data file.

The homepage should show:

* One featured claim.
* Five to seven standard claim cards.
* Questions rather than assertions.
* Topic identity.
* One-sentence description.
* Optional chart or visual preview.
* Curiosity-oriented call to action.

Do not show:

* Verdict.
* Popularity score.
* Update date.
* Reading time.
* Trend indicators.

### 9.4 Preserve topic exploration

Render all concerns below popular claims.

Each concern should include:

* Topic icon.
* Topic name.
* Short description.
* Topic colour.
* Link to the topic page.

### 9.5 Remove unrelated homepage sections

Do not show in the MVP:

* Newsletter.
* Statistics dashboard.
* Latest investigations.
* Latest updates.
* Source directory.
* Methodology promotion.
* Random claim.
* User account features.

### 9.6 Add responsive layout

Mobile:

* Featured claim first.
* Standard claims in a vertical list.
* No horizontal carousel hiding content.
* Topics arranged for easy touch navigation.

Desktop:

* Featured claim receives stronger hierarchy.
* Standard cards use a grid.

## Deliverables

* New homepage.
* Popular claims static configuration.
* Search suggestions.
* Responsive concern section.

## Acceptance Criteria

Within 30 seconds, a first-time visitor can:

* Understand the site's purpose.
* Recognise the question about Spain's real condition.
* Open a popular claim.
* Browse the principal concerns.

---

# 10. Milestone 4 — Claim Page Rebuild

## Goal

Transform claim pages from conventional verification articles into quick, visual explanations that reveal complexity.

## Specifications

* [`plans/claim-page.md`](./plans/claim-page.md)
* [`plans/sharing-system.md`](./plans/sharing-system.md)
* [`plans/visual-design-system.md`](./plans/visual-design-system.md)
* [`plans/information-architecture-spec.md`](./plans/information-architecture-spec.md)

## Existing Route

```text
src/pages/verificaciones/[slug].astro
```

## Target Route

```text
src/pages/afirmaciones/[slug].astro
```

## Tasks

### 10.1 Build the target route

Create the new route and use existing claim data.

Add redirects from old verification URLs.

If redirects cannot be implemented immediately, preserve old pages until the new route is proven.

### 10.2 Create claim-page components

Recommended components:

```text
src/components/claims/ClaimHero.astro
src/components/claims/MainInsight.astro
src/components/claims/TruthCard.astro
src/components/claims/MisconceptionCard.astro
src/components/claims/DisagreementSection.astro
src/components/claims/EvidenceBlock.astro
src/components/claims/RelatedClaims.astro
src/components/claims/DeepInvestigation.astro
```

Use names that fit the project conventions. Avoid unnecessary abstraction.

### 10.3 Implement the first-screen experience

Above the fold:

* Topic.
* Claim question.
* Existing verdict.
* One-sentence answer.
* What the user will understand.
* Short estimated consumption time.
* Primary sharing action.

The first screen must not be a large wall of text.

### 10.4 Add the main visual

Every priority claim should have one primary visual.

It may be:

* Chart.
* Comparison.
* Timeline.
* Map.
* Statistic.

The visual must include:

* Question.
* Main takeaway.
* Visual.
* Short explanation.

### 10.5 Add `Lo que es cierto`

Render concise evidence cards.

Each card should explain:

* The finding.
* The relevant data.
* Why it matters.
* Contextual source link where appropriate.

### 10.6 Add common misconceptions

Render short misconception blocks.

Each must distinguish:

* What people often conclude.
* Why that conclusion is incomplete or incorrect.

### 10.7 Add disagreement section conditionally

Only show:

> Por qué existe desacuerdo

when the claim contains genuine competing mechanisms or interpretations.

Do not force it onto every page.

Avoid left-versus-right framing.

### 10.8 Embed evidence visuals

Charts should be distributed through the page.

Do not create a dense dashboard or put every chart into one gallery.

### 10.9 Preserve deep investigations

Existing long-form content should remain available through an expandable section on the same page.

Do not require users to navigate away.

### 10.10 Add four related claims

Use existing relations where available.

If fewer than four relevant claims exist:

* Show the available claims.
* Do not fill the space with weak or unrelated links.
* Add more claim content later.

### 10.11 Add topic navigation

Show:

* Primary topic.
* Secondary topics where relevant.
* All topics after related claims.

### 10.12 Pilot before mass migration

Fully rebuild three representative claim pages first:

1. A data-heavy claim.
2. A controversial causal claim.
3. A claim with limited or uncertain evidence.

Review the components before converting every claim.

## Deliverables

* New claim route.
* Redirect strategy.
* Shared claim components.
* Three pilot claims.
* Migration checklist for remaining claims.

## Acceptance Criteria

A user can:

* Understand the core issue in under one minute.
* Consume the main page in approximately two to five minutes.
* See why the issue is complicated.
* Continue to deeper evidence if interested.
* Explore related claims.

---

# 11. Milestone 5 — Topic Page Rebuild

## Goal

Transform existing concern investigations into visual topic hubs that answer:

> ¿Cómo está realmente España en este ámbito?

## Specifications

* [`plans/topic-page.md`](./plans/topic-page.md)
* [`plans/visual-design-system.md`](./plans/visual-design-system.md)
* [`plans/information-architecture-spec.md`](./plans/information-architecture-spec.md)

## Main Route

```text
src/pages/preocupaciones/[slug].astro
```

## Tasks

### 11.1 Add topic hero

Include:

* Topic title.
* Main question.
* Short answer.
* Topic illustration.
* Estimated overview time.

### 11.2 Add current situation summary

Include:

* Overall qualitative assessment.
* Three key findings.
* Main visual.

The assessment may use language such as:

* Serious problem.
* Mixed situation.
* Improving but fragile.
* Better than commonly perceived.

Colour must not encode severity. Use text and explicit labels.

### 11.3 Add public-perception introduction

Add:

> ¿Por qué muchas personas creen que este problema está empeorando?

Possible explanations:

* Personal experience.
* Media visibility.
* Economic changes.
* Political messaging.
* Recent events.
* Social media.

This section should explain the perception without dismissing it.

### 11.4 Add related popular claims

Show four to eight claim cards associated with the topic.

Only display claims with completed pages.

### 11.5 Prioritise visuals

Keep the existing visual richness.

Use:

* Charts.
* Maps.
* Timelines.
* Comparisons.
* Infographics.

Do not artificially restrict pages to three or five charts. Use as many as materially improve understanding, while preserving white space and scanability.

### 11.6 Add timeline

Use existing investigation data where possible.

The timeline should explain how the current situation developed.

### 11.7 Preserve existing investigation

Keep the current long-form investigation below the overview.

Do not rewrite it unless needed for:

* Accuracy.
* Duplication removal.
* Mobile readability.
* Consistency with the new summary.

### 11.8 Add navigation

At the end:

* Related claims.
* All topics.

### 11.9 Pilot topics

Start with:

1. Vivienda.
2. Inmigración.
3. Sanidad or Economía.

These represent different data and visualisation needs.

## Deliverables

* Topic-page component structure.
* Three pilot topic pages.
* Migration checklist for remaining investigations.

## Acceptance Criteria

A user can:

* Understand the topic's current status quickly.
* Learn why it is perceived as a problem.
* Explore the main claims.
* Consume substantial visual evidence.
* Continue into the full investigation.

---

# 12. Milestone 6 — Sharing System

## Goal

Make better arguments easy to share through messaging apps, forums and social media.

## Specifications

* [`plans/sharing-system.md`](./plans/sharing-system.md)
* [`plans/visual-design-system.md`](./plans/visual-design-system.md)

## Existing Infrastructure

```text
scripts/generate-social-cards.mjs
npm run cards
```

## Tasks

### 12.1 Audit the current card generator

Identify:

* Input data.
* Output paths.
* Supported templates.
* Image sizes.
* Existing branding.
* Whether cards are generated per claim, topic or page.

### 12.2 Define MVP asset types

Support:

* Page social preview.
* Claim summary card.
* Chart or main-insight card.
* Statistic card.
* Misconception card where feasible.

Do not attempt to make every arbitrary page block exportable in the first iteration.

### 12.3 Create universal social dimensions

Choose one universal image format suitable for:

* WhatsApp.
* Telegram.
* X.
* Forums.

Platform-specific variants are post-MVP.

### 12.4 Include discreet branding

Each generated asset includes:

* Logo.
* `elpaisestafatal.es`.

Do not include:

* QR codes.
* Full citation lists.
* Excessive promotional copy.

### 12.5 Add page-level sharing

Use the Web Share API where supported.

Fallback:

* Copy URL.
* Download social image.
* Open platform share link only where reliable.

### 12.6 Add block-level sharing

Priority blocks:

* Main visual.
* Statistic.
* Misconception.
* Timeline.
* Comparison.

Each priority block may support:

* Share image.
* Download image.
* `Responder con esto`.

### 12.7 Implement `Responder con esto`

Create concise pre-authored responses in the claim data or appropriate static file.

Do not generate them at runtime with AI.

The action should copy:

* A natural short explanation.
* Optional page link.

The response should:

* Sound conversational.
* Avoid institutional tone.
* Avoid hostility.
* Preserve nuance.
* Be useful independently.

### 12.8 Generate assets at build time

Extend:

```text
scripts/generate-social-cards.mjs
```

Prefer build-time card generation over browser screenshot generation.

Benefits:

* Stable output.
* Faster sharing.
* Predictable design.
* Better social metadata.

### 12.9 Add card generation validation

The script should report:

* Missing images.
* Missing titles.
* Text overflow.
* Missing output.
* Unsupported card type.

## Deliverables

* Updated social-card generator.
* Universal share templates.
* Page and block sharing controls.
* Static `Responder con esto` responses.
* Share metadata integration.

## Acceptance Criteria

Users can:

* Share an attractive page preview.
* Download or share a core insight image.
* Copy a useful response in one action.
* Understand the shared idea without immediately opening the site.

---

# 13. Milestone 7 — Search and Discovery

## Goal

Allow users to find published claims and topics from any page without implying unlimited AI capabilities.

## Specifications

* [`plans/homepage.md`](./plans/homepage.md)
* [`plans/information-architecture-spec.md`](./plans/information-architecture-spec.md)

## Existing Infrastructure

```text
src/data/search.ts
src/pages/verificaciones/index.astro
```

## Tasks

### 13.1 Audit the existing search index

Determine whether `search.ts` includes:

* Claims.
* Topics.
* Keywords.
* Alternate wording.
* Popularity or priority.
* URLs.

### 13.2 Create a static search index

At minimum:

```ts
{
  type: "claim" | "topic",
  title: string,
  description: string,
  url: string,
  keywords: string[],
  primaryTopic?: string
}
```

This is a small search index, not a general content database.

### 13.3 Prioritise claims

Results order:

1. Exact claim matches.
2. Closely matching claims.
3. Topic matches.
4. Broader keyword matches.

### 13.4 Add autocomplete

Desktop:

* Search field in the header.
* Suggestions below.

Mobile:

* Dedicated search overlay or page.
* Large touch targets.
* Clear close action.

### 13.5 Define empty and no-result states

Empty:

* Show popular claims.

No result:

* Explain that only published content is searchable.
* Suggest relevant topics.
* Do not fabricate an answer.
* Optionally invite the user to contact the project with a suggestion later.

### 13.6 Decide the fate of the verification index

The existing:

```text
/verificaciones/
```

may become:

* A redirect to search.
* A redirect to the homepage's popular-claims section.
* A hidden legacy index.

Do not create a large all-claims directory for the MVP.

## Deliverables

* Static search index.
* Header and mobile search.
* Suggestions and no-result states.
* Legacy verification-index handling.

## Acceptance Criteria

Users can locate:

* A claim by natural wording.
* A topic by name.
* Related published content.

The interface never suggests that an AI will answer unknown questions.

---

# 14. Milestone 8 — SEO and Metadata

## Goal

Ensure claim and topic pages are discoverable, understandable and shareable through search engines and social platforms.

## Specifications

* [`plans/information-architecture-spec.md`](./plans/information-architecture-spec.md)
* [`plans/sharing-system.md`](./plans/sharing-system.md)

## Tasks

### 14.1 Create consistent metadata

Every page should define:

* Unique title.
* Description.
* Canonical URL.
* Open Graph title.
* Open Graph description.
* Open Graph image.
* Twitter/X card metadata where applicable.

### 14.2 Add structured data

Claim pages may use:

* `Article`.
* `WebPage`.
* `FAQPage` only when actual visible FAQs exist.
* `BreadcrumbList`.

Topic pages may use:

* `Article` or `WebPage`.
* `BreadcrumbList`.

Avoid unsupported or misleading fact-check schema unless the site meets its requirements and the page genuinely represents that use case.

### 14.3 Implement redirects

Create permanent redirects for:

* Old verification URLs.
* Merged contact page.
* Any renamed routes.

### 14.4 Preserve existing URLs

Avoid breaking topic URLs already indexed.

### 14.5 Add sitemap and robots checks

Verify:

* Claim pages are included.
* Topic pages are included.
* CSV endpoints are treated intentionally.
* Legacy or duplicate routes are excluded where appropriate.

### 14.6 Improve internal linking

Ensure:

* Every claim links to a topic.
* Every topic links to claims.
* Every claim has up to four relevant claim links.
* All topic pages expose other topics.
* Breadcrumbs are crawlable links.

### 14.7 Add visible freshness signals where useful

The product previously chose not to emphasise confidence or work-in-progress language.

However, claim and topic pages may still display:

* Last updated date.
* Revision history link.

Do not place these prominently on homepage cards.

### 14.8 Review utility pages

Keep:

* Sources.
* Methodology.
* Revisions.
* Privacy.

They do not need global-navigation prominence, but they support trust and SEO.

## Deliverables

* Shared SEO component or layout support.
* Structured data.
* Redirects.
* Sitemap verification.
* Internal-link audit.

## Acceptance Criteria

* No duplicate canonical pages.
* Shared links show correct images and descriptions.
* Existing indexed URLs continue to function.
* Claim pages are discoverable by their natural questions.

---

# 15. Milestone 9 — Accessibility, Performance and Quality

## Goal

Ensure the redesigned product is usable, fast and robust.

## Specifications

* [`plans/visual-design-system.md`](./plans/visual-design-system.md)

## Tasks

### 15.1 Accessibility review

Check:

* Heading order.
* Keyboard navigation.
* Focus states.
* Link purpose.
* Button labels.
* Colour contrast.
* Alternative text.
* Chart text alternatives.
* Expandable-section semantics.
* Touch-target size.
* Reduced-motion preferences.

### 15.2 Chart accessibility

Each chart must include:

* Clear title.
* Written takeaway.
* Data source link on the page.
* Text summary.
* Accessible data table or equivalent where practical.

### 15.3 Performance review

Optimise:

* Illustration sizes.
* Chart rendering.
* Social images.
* Font loading.
* Client-side JavaScript.
* Search bundle size.

Prefer:

* Static HTML.
* Responsive images.
* Lazy-loading below-the-fold media.
* Minimal hydration.

### 15.4 Mobile QA

Test at least:

* 320 px.
* 375 px.
* 390 px.
* Tablet.
* Desktop.

Check:

* Hero.
* Search.
* Popular claim cards.
* Charts.
* Breadcrumbs.
* Sharing controls.
* Expandable investigations.
* Topic navigation.

### 15.5 Browser QA

Test current versions of:

* Chrome.
* Safari.
* Firefox.
* Mobile Safari.
* Android Chrome where possible.

### 15.6 Automated checks

Run on every meaningful milestone:

```bash
npm run check
npm run build
npm run audit:investigations
npm run cards
```

Add tests or validation scripts for high-risk static content where beneficial.

## Deliverables

* Accessibility checklist.
* Performance report.
* Mobile QA results.
* Resolved build and content-generation errors.

## Acceptance Criteria

* Core navigation works by keyboard.
* Primary content remains usable without JavaScript.
* Mobile pages avoid horizontal overflow.
* Charts have meaningful text alternatives.
* Build and card generation complete reliably.

---

# 16. Milestone 10 — Content Preparation and MVP Launch

## Goal

Publish a coherent MVP rather than redesigning every existing page incompletely.

## Tasks

### 16.1 Select the MVP claim set

Choose six to eight popular homepage claims.

Every selected claim must have:

* Completed claim page.
* Main visual.
* Short answer.
* Verdict.
* Truth or evidence blocks.
* Misconceptions.
* Related claims where available.
* Share card.
* `Responder con esto`.

Recommended starting topics:

* Immigration.
* Housing.
* Taxes.
* Economy or cost of living.
* Healthcare.
* Public safety.
* Employment or youth.

### 16.2 Select priority topic pages

Fully rebuild at least:

* Vivienda.
* Inmigración.
* Sanidad.
* Economía or empleo.

Other topic pages may temporarily retain their current long-form design if navigation and layout remain functional.

### 16.3 Review homepage balance

Ensure:

* Six to eight claims.
* No single topic dominates.
* One clear featured claim.
* Every card points to a completed page.
* All 14 concerns remain accessible.

### 16.4 Editorial review

For every MVP claim:

* Verify facts.
* Verify links.
* Check dates.
* Confirm chart labels.
* Confirm no source is misrepresented.
* Confirm verdict matches the explanation.
* Check that uncertainty is not hidden.
* Review naturalness of share text.

### 16.5 Social preview review

Test shared links in:

* WhatsApp.
* Telegram.
* X card validator or equivalent preview.
* General Open Graph preview tool.
* Forum-style link preview if relevant.

### 16.6 Analytics

Use minimal, privacy-conscious analytics.

Track:

* Homepage claim clicks.
* Search usage.
* Claim-to-related-claim navigation.
* Claim-to-topic navigation.
* Share-action clicks.
* `Responder con esto` clicks.
* Visual-download clicks.
* Mobile versus desktop use.

Do not delay launch for advanced behaviour analysis.

### 16.7 Launch checklist

Before launch:

```bash
npm run check
npm run build
npm run audit:investigations
npm run calculate:concerns
npm run cards
```

Verify:

* Redirects.
* Sitemap.
* Canonicals.
* Social previews.
* Mobile navigation.
* Search.
* Broken links.
* Missing images.
* Missing claim relations.

## Deliverables

* Complete MVP homepage.
* Six to eight complete popular Claim Pages.
* At least four redesigned Topic Pages.
* Sharing functionality.
* Search.
* SEO metadata.
* QA sign-off.

## Acceptance Criteria

The MVP supports the complete user journey:

```text
Homepage
↓
Popular claim
↓
Quick visual explanation
↓
Related claim or topic
↓
Share a better argument
```

---

# 17. Post-MVP Backlog

The following items are explicitly postponed.

## Content and media

* Curated videos.
* Curated podcasts.
* Verified lived experiences.
* Interviews.
* Documentary clips.
* Platform-specific social assets.
* Vertical video generation.

## AI

* Arbitrary claim verification.
* Runtime AI assistant.
* Automatic claim generation.
* Automated monitoring of social media.
* AI-generated share responses.
* AI-generated ranking.

## Platform

* Database.
* CMS.
* User accounts.
* Personalisation.
* Comments.
* Community discussions.
* User submissions.
* Notifications.
* Topic subscriptions.

## Data and interaction

* Live dashboards.
* Automatic timelines.
* Region-personalised pages.
* Advanced interactive simulations.
* Historical popular-claim archive.
* Popularity indicators.
* Continuous trend tracking.

---

# 18. Suggested Implementation Batches

For work with coding agents, use small batches.

## Batch A — Foundations

* Global styles.
* Topic identity.
* Header.
* Footer.
* Breadcrumbs.

## Batch B — Homepage

* Hero.
* Popular claims.
* Topic grid.
* Search suggestions.

## Batch C — Claim pilot

* Claim layout.
* Main visual.
* Evidence cards.
* Misconceptions.
* Related claims.
* Deep investigation.

## Batch D — Topic pilot

* Topic hero.
* Current status.
* Public-perception introduction.
* Claims.
* Visuals.
* Timeline.

## Batch E — Sharing

* Card generator.
* Page sharing.
* Main visual sharing.
* `Responder con esto`.

## Batch F — Discovery and SEO

* Search.
* Metadata.
* Structured data.
* Redirects.
* Sitemap.

## Batch G — QA and launch

* Accessibility.
* Performance.
* Content review.
* Social previews.
* Analytics.

Every batch should be committed separately.

---

# 19. Coding-Agent Instructions

When asking an AI coding agent to implement a milestone, include:

1. The relevant product specification files.
2. The exact milestone section from this roadmap.
3. A request to inspect existing code before changing it.
4. A requirement to preserve existing content.
5. A requirement to run:

```bash
npm run check
npm run build
```

6. A request to report:

   * Files changed.
   * Decisions made.
   * Remaining gaps.
   * Test results.

Example:

```text
Implement Milestone 3 — Homepage Rebuild from IMPLEMENTATION_ROADMAP.md.

Before editing, read:

- plans/product-vision.md
- plans/homepage.md
- plans/popular-claims-page.md
- plans/visual-design-system.md
- plans/information-architecture-spec.md

Inspect the existing Astro project and reuse current data structures where possible.

Do not introduce a database, CMS or runtime AI.

Preserve existing concern content.

After implementation, run:

npm run check
npm run build

Report the changed files, implementation decisions, remaining limitations and command results.
```

---

# 20. Definition of MVP Completion

Version 1.0 is complete when:

* The homepage clearly asks whether Spain is really in a bad situation.
* Six to eight popular claims provide the main entry point.
* Claim Pages are quick, visual and reveal complexity.
* Topic Pages provide broad visual overviews.
* Search finds published claims and topics.
* Users can share useful arguments and visuals.
* Navigation connects claims and topics.
* The experience is mobile-first.
* Existing research remains accessible.
* No database or runtime AI is required.
* The static Astro build is reliable.
* All approved product specifications are materially represented in the implementation.

The MVP does not require every existing claim or topic to be fully redesigned.

It requires one complete, coherent and trustworthy experience that can then be expanded incrementally.
