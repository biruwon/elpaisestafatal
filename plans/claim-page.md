# Claim Page Specification v1.0

## Status

Approved

---

# Goal

The Claim Page is the core experience of El País Está Fatal.

Its purpose is not simply to verify a claim.

Its purpose is to help users understand why a controversial issue is more complex than it initially appears.

A successful claim page should leave users with:

- A clear understanding of the available evidence.
- A better understanding of why people disagree.
- A clear distinction between facts, uncertainty and opinion.
- Enough context to continue exploring the topic if they wish.

The page should optimise for fast consumption while still allowing deep exploration.

---

# Design Principles

- Mobile-first.
- Highly visual.
- Easy to scan.
- Evidence before opinion.
- Short explanations before long articles.
- Every visual answers one specific question.
- Every section should be understandable independently.

---

# Estimated Reading Time

Target:

2–5 minutes for the main content.

The complete investigation should remain available for users wanting additional depth.

---

# Page Structure

## 1. Hero

Purpose:

Immediately answer the user's question and explain what they will learn.

Contents:

- Claim title.
- One-sentence answer.
- "What you'll learn" section.
- Estimated reading time.
- Share button.

Example:

¿La inmigración aumenta la delincuencia?

No existe una respuesta simple. Depende de qué datos se analicen y cómo se interpreten.

En menos de 3 minutos descubrirás:

- Qué dicen realmente las estadísticas.
- Por qué personas razonables llegan a conclusiones distintas.
- Qué partes del debate son hechos y cuáles son opiniones.

---

## 2. Main Visual

Purpose:

Provide the most important insight immediately.

Possible visualisations:

- Line chart.
- Comparison chart.
- Map.
- Timeline.
- Infographic.

Only one visual should appear first.

It should answer the most important question related to the claim.

---

## 3. Short Explanation

Purpose:

Explain the main takeaway in plain language.

Maximum:

2–3 short paragraphs.

---

## 4. What Is True

Purpose:

Highlight the evidence everyone should understand.

Presented as short evidence cards.

Each card contains:

- Statement.
- Supporting data.
- Source.
- Why it matters.

---

## 5. Common Misconceptions

Purpose:

Explain the most common incorrect interpretations.

Example:

❌ Higher conviction rates do not automatically mean nationality is the cause.

❌ National averages do not describe every municipality.

Each misconception should include a short explanation.

---

## 6. Why People Disagree

Optional section.

Only included when the claim is genuinely controversial.

Purpose:

Explain the different mechanisms people focus on.

Avoid presenting political "sides".

Instead explain competing explanations.

Example:

Housing prices:

- Supply constraints.
- Population growth.
- Tourism.
- Investment.
- Regulation.

---

## 7. Evidence

Purpose:

Provide supporting evidence using visual content.

Preferred formats:

- Charts.
- Maps.
- Timelines.
- Comparison tables.
- Statistics cards.

Evidence should be presented as independent blocks.

Each block should answer one specific question.

---

## 8. Deep Investigation

Purpose:

Allow users to continue reading.

Implementation:

Expandable section on the same page.

Reuse the existing investigation content.

Avoid navigating to another page.

---

## 9. Related Claims

Purpose:

Encourage continued exploration.

Display:

4–6 related claims from the same concern.

No unrelated recommendations.

---

## 10. Sharing

Purpose:

Make sharing a primary feature.

Sharing should not be limited to the bottom of the page.

Every major content block should be individually shareable.

Supported assets:

- Graphs.
- Statistics.
- Comparison tables.
- Timelines.
- Short summaries.

Each asset should support:

- Download as image.
- Share.
- Copy.

Optimise for:

- WhatsApp.
- Telegram.
- Forums.
- Social media.

The goal is to create highly shareable visual explanations rather than encouraging users to share entire articles.

---

# Rich Media (Future)

Not part of MVP.

The page should be designed to support curated rich media in future versions.

Possible media:

- Videos.
- Podcast episodes.
- Interviews.
- Lived experiences.
- Documentary clips.

Rich media should never be automatically embedded solely because it appears relevant.

Every item should be manually reviewed before publication.

The future data model should allow each claim to reference multiple curated media resources.

Example:

Recommended video

Recommended podcast

Official documentary

Verified lived experience

Each media resource should include:

- Title.
- Description.
- Why it is relevant.
- Source.
- Publication date.

---

# Lived Experiences (Future)

Not part of MVP.

Future versions may include real stories illustrating how different people experience the same issue.

Examples:

- Local resident.
- Teacher.
- Doctor.
- Police officer.
- Immigrant worker.
- Employer.

Stories should illustrate mechanisms rather than serve as evidence.

Each story should explicitly state:

- What this experience illustrates.
- What this experience does NOT prove.

All lived experiences should be reviewed before publication.

---

# Removed from MVP

The following features are intentionally excluded:

- Comments.
- User ratings.
- Community discussions.
- Automatic AI-generated explanations.
- Automatically selected external videos.
- Automatically selected lived experiences.

---

# User Journey

Homepage

↓

Trending Claim

↓

Claim Page

↓

Related Claims

↓

Topic Investigation

---

# Success Criteria

A successful claim page should allow users to:

- Understand the claim in less than one minute.
- Continue reading if they want more depth.
- Leave understanding why the issue is more complicated than it first appeared.
- Easily share individual visuals and explanations with others.