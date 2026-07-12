# Popular Claims Specification v1.0

## Status

Approved

---

# Purpose

The **Afirmaciones populares** section is the primary entry point on the homepage of El País Está Fatal.

Its purpose is to present widely repeated claims about Spain that users are likely to recognise from public debate, social media, news coverage or personal conversations.

The section is not limited to misinformation.

It may include claims that are:

* True.
* False.
* Partially true.
* Misleading.
* Controversial.
* Difficult to answer without additional context.

The objective is to encourage users to investigate whether familiar claims about Spain are supported by the available evidence.

---

# MVP Scope

The MVP will use a manually curated list of popular claims.

It will not include:

* Automated trend detection.
* Live social media monitoring.
* Popularity scores.
* Search-volume integrations.
* Automatic publishing.
* A historical archive.
* Daily or weekly update commitments.
* A database.

Claims will remain visible until they are manually removed or replaced.

---

# Public Naming

The user-facing section will be called:

> **Afirmaciones populares**

Avoid using:

* Trending claims.
* Viral claims.
* Misinformation.
* Fact checks.

The name should communicate that these are claims commonly heard in public debate, without implying that all of them are false or temporarily trending.

---

# Static Implementation

Popular claims will be maintained in a separate static TypeScript file.

Recommended location:

```text
src/data/popular-claims.ts
```

The homepage will import this file and render the claim cards.

Example:

```ts
export const popularClaims = [
  {
    title: "¿La inmigración aumenta la delincuencia?",
    description:
      "La diferencia bruta existe, pero no explica por sí sola cuál es la causa.",
    href: "/afirmaciones/inmigracion-delincuencia",
    primaryTopic: "inmigracion",
    topics: ["inmigracion", "seguridad"],
    featured: true,
    visual: "/images/claims/inmigracion-delincuencia.webp",
  },
];
```

This is a lightweight static configuration, not a formal content model or database.

---

# Publication Requirement

A popular claim must only appear on the homepage when its complete Claim Page is already published.

Do not display:

* “Coming soon” claims.
* Placeholder pages.
* Provisional answers.
* Claims without sufficient supporting evidence.
* Claims whose visual or explanatory content is unfinished.

This prevents users from arriving at incomplete or low-quality pages.

---

# Number of Claims

The homepage should display between:

> **6 and 8 popular claims**

This provides enough variety without overwhelming the user.

The exact number may vary within that range depending on the quality and diversity of available claim pages.

---

# Card Hierarchy

The section should use:

* One featured claim.
* Five to seven standard claim cards.

The featured claim should receive more visual space and appear first.

It should represent the claim judged to be most relevant or useful at that moment.

On mobile:

* Cards should appear in a vertical sequence.
* Do not hide most claims inside a horizontal carousel.
* The featured claim should remain visually distinct.

---

# Claim Card Content

Each card should contain:

* Primary topic or concern.
* Claim phrased as a question.
* One-sentence description.
* Visual preview when available.
* Clear call to action.

Example:

```text
INMIGRACIÓN · SEGURIDAD

¿La inmigración aumenta la delincuencia?

La diferencia bruta existe, pero no explica por sí sola cuál es la causa.

Entender el debate →
```

Do not show:

* Verdict labels.
* Popularity indicators.
* View counts.
* Trend arrows.
* Update dates.
* Reading time.
* Confidence scores.

These elements would add unnecessary complexity or make the site look like a conventional fact-checking platform.

---

# Claim Wording

Claims should be written as questions throughout the homepage and Claim Pages.

Preferred:

> ¿La inmigración aumenta la delincuencia?

Avoid:

> La inmigración aumenta la delincuencia.

Question-based wording should:

* Feel less confrontational.
* Invite curiosity.
* Avoid repeating a claim as though it were established fact.
* Match the exploratory identity of the project.
* Reinforce the larger question: “¿España está fatal o no?”

Exceptions may be made when analysing the exact wording of a specific public statement, but the default public title should remain a question.

---

# Descriptions

Every card should include one short description explaining why the claim is worth exploring.

The description should:

* Create curiosity.
* Reveal that the issue contains important context.
* Avoid giving away the entire conclusion.
* Avoid sensationalism.
* Remain understandable without reading the full page.

Good example:

> Los datos muestran diferencias, pero interpretarlas requiere comparar poblaciones y contextos distintos.

Avoid:

> Todo lo que te han contado es mentira.

Descriptions should normally contain one sentence.

---

# Visual Treatment

Cards should use one of the following:

1. A preview of the main chart or visual from the Claim Page.
2. A consistent topic icon.
3. A typography-only design using the topic’s visual identity.

When a suitable chart preview exists, it is preferred.

When no visual exists, use a consistent topic icon or typography treatment.

Do not use automatically generated decorative images merely to fill space.

Visuals should:

* Communicate information.
* Reinforce the subject.
* Maintain credibility.
* Work clearly on mobile.
* Remain readable when shared or screenshotted.

---

# Topic Associations

A claim may belong to multiple topics.

Example:

```ts
{
  primaryTopic: "inmigracion",
  topics: ["inmigracion", "vivienda"]
}
```

The primary topic controls:

* The label displayed first.
* The main visual category.
* The claim’s principal placement.
* The default breadcrumb and navigation context.

Secondary topics express cross-topic relationships.

---

# Topic Variety

The homepage should avoid being dominated by one topic.

As a general editorial rule:

> No single primary topic should occupy most of the popular claim cards.

Recommended default:

* Maximum two claims from the same primary topic among six to eight cards.

An exception may be made during an unusually important national event, but the homepage should normally represent a range of concerns.

The section should help users evaluate the broader condition of Spain, not behave as a single-topic news feed.

---

# Ordering

Claims will be ordered manually using editorial judgment.

No numerical ranking or automatic score is required.

The ordering should consider:

* Relevance to public debate.
* Importance for understanding Spain’s situation.
* Potential consequences of misunderstanding the claim.
* Quality of the available evidence.
* Usefulness of the finished Claim Page.
* Variety across concerns.
* Visual balance across cards.

The featured claim should be the item judged most likely to give users immediate value.

The ordering is an editorial decision and should not be presented as an objective popularity ranking.

---

# Rotation and Maintenance

Popular claims will be reviewed and changed whenever editorially useful.

There is no promised update frequency.

Claims may remain visible for extended periods when they continue to represent common public beliefs.

A claim should be replaced when:

* It is no longer broadly relevant.
* A more important claim deserves visibility.
* Its evidence has become outdated.
* The Claim Page requires revision.
* The homepage lacks topic variety.
* User behaviour suggests another claim is more useful.

The site should not claim that these are the most discussed claims “today” unless a reliable monitoring process is introduced in the future.

---

# AI-Assisted Editorial Discovery

AI may assist in identifying candidate popular claims.

This process is informal and manually initiated.

AI must not:

* Publish claims.
* Modify the homepage directly.
* Decide which claims are true.
* Replace human source verification.
* Automatically rank claims.
* Automatically remove existing claims.

The final editorial decision always belongs to the project owner.

---

# Documented AI Prompt

The following prompt may be used when reviewing potential additions:

```text
Act as an editorial research assistant for El País Está Fatal, a Spanish website that examines popular claims about the state of Spain using public evidence.

Identify widely repeated claims currently present in Spanish public debate.

Cover these areas where relevant:

- Housing
- Immigration
- Politics and corruption
- Economy and cost of living
- Employment
- Healthcare
- Taxes
- Inequality and poverty
- Public safety
- Youth and opportunities
- Social polarisation
- Education
- Pensions
- Public services

For each candidate claim, provide:

1. The claim phrased as a neutral question.
2. The topic or topics it belongs to.
3. Why it appears relevant in public debate.
4. Examples of reputable sources showing that the claim is being discussed.
5. Whether sufficient public evidence appears to exist to analyse it responsibly.
6. Whether it overlaps with a claim already present on the website.
7. A suggested one-sentence homepage description.

Do not classify the claim as true or false without examining the evidence.

Do not suggest claims based solely on a single viral post.

Prioritise claims that are widely repeated, socially important, frequently misunderstood and supported by enough evidence to create a rigorous Claim Page.
```

Any claims proposed by AI must be independently checked before being selected.

---

# Editorial Workflow

## Adding a claim

1. Identify a candidate manually or with AI assistance.
2. Confirm that it is widely repeated or socially relevant.
3. Verify that enough reliable evidence exists.
4. Check whether an equivalent Claim Page already exists.
5. Research and publish the complete Claim Page.
6. Prepare the card title, description and visual.
7. Add the claim to `src/data/popular-claims.ts`.
8. Choose its manual position.
9. Check topic variety.
10. Review the homepage on desktop and mobile.

## Removing a claim

1. Remove it from `src/data/popular-claims.ts`.
2. Keep the Claim Page published unless its content is obsolete.
3. Replace it with another finished claim if necessary.
4. Review card and topic balance.

Removing a claim from the homepage does not require deleting its page.

---

# Homepage Interaction

Expected user journey:

```text
Homepage

↓

Afirmaciones populares

↓

Select a familiar question

↓

Claim Page

↓

Understand the issue quickly

↓

Explore related claims from the same topic
```

The section should appear before the 14 main concerns.

---

# Accessibility

Cards must:

* Be fully keyboard accessible.
* Use meaningful link text.
* Avoid relying only on colour.
* Include alternative text for informational images.
* Maintain readable text sizes.
* Preserve contrast over visual previews.
* Make the full card clickable without creating nested interactive controls.

---

# Success Criteria

The Afirmaciones populares section succeeds when:

* Users understand that the website analyses common beliefs about Spain.
* Users can select a relevant claim without needing to formulate a search.
* The section provides variety across major concerns.
* All cards lead to complete, evidence-based Claim Pages.
* Users click through to investigate whether Spain is genuinely in a bad situation.
* Maintenance remains realistic for a single-person project.

---

# Future Possibilities

Not part of the MVP:

* Automated public-debate monitoring.
* Search-volume data.
* Social-media trend detection.
* Popularity scoring.
* Historical claim archives.
* Daily or weekly claim rotation.
* Automatically suggested homepage ordering.
* Admin interfaces.
* Database-backed publication.
* User-submitted claims.
* Automatic AI publication.
