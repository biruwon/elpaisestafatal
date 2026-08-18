With more topics and hundreds of claims, **the website cannot remain a collection of investigations arranged as cards**. That structure works with 12–20 topics. It breaks when you have:

- 20–25 investigations;
- 200–400 claims;
- overlapping claims across topics;
- new claims appearing every week;
- several levels of evidence and uncertainty;
- different user intents.

The site should evolve from:

> **A catalogue of Spain’s problems**

into:

> **A searchable, interconnected system for understanding claims about Spain.**

The investigations should remain, but they stop being the primary unit of navigation. The primary unit becomes the **claim**.

# 1. The new information architecture

You need four distinct content levels.

## Level 1 — Claims

These are the pages users discover, search and share.

Examples:

- “Los inmigrantes reciben más ayudas que los españoles”
- “España tiene más políticos que ningún país europeo”
- “Las denuncias falsas por violencia de género son habituales”
- “Las renovables provocan apagones”
- “Eliminar las autonomías ahorraría miles de millones”
- “Los okupas tienen más derechos que los propietarios”

A claim page answers one precise question.

## Level 2 — Investigations

These are your comprehensive topic dossiers:

- Immigration
- Housing
- Education
- Taxes
- Healthcare
- Climate and energy

Investigations explain the complete system and connect multiple claims.

## Level 3 — Evidence objects

Reusable evidence underneath claims:

- statistical series;
- legal texts;
- datasets;
- charts;
- definitions;
- studies;
- official reports;
- methodological caveats.

The same evidence object may support several claims.

## Level 4 — Events and current narratives

These are topical entry points:

- a political speech;
- a crime;
- a new law;
- an election;
- an energy blackout;
- a protest;
- a viral video.

Events point users toward the relevant evergreen claims and investigations.

The resulting structure is:

```text
Current event
    ↓
Recurring claim
    ↓
Evidence and competing explanations
    ↓
Complete investigation
```

That is much more useful than forcing visitors to begin with the entire dossier.

# 2. The homepage should no longer display every topic equally

As the site grows, a grid of 20 or 25 concerns becomes overwhelming. It asks the visitor to browse your taxonomy rather than solve their problem.

The homepage should have three main entry paths.

## A. “What have you heard?”

The central interaction:

> **Pega una afirmación, escribe una pregunta o busca un tema.**

Examples inside the search field:

- ¿Los inmigrantes reciben más ayudas?
- ¿Cuántos políticos hay en España?
- ¿Las pensiones son sostenibles?
- ¿La ley protege a los okupas?
- ¿Las renovables encarecen la luz?

This should be the dominant element.

Initially, it does not need a generative AI answer. It can search your curated claim database.

## B. “What is being discussed now?”

A small current section:

### Hoy se está diciendo…

- “El apagón demuestra que las renovables no funcionan”
- “La regularización dará papeles a un millón de inmigrantes”
- “España es el país con más impuestos de Europa”

Each links to an existing claim page, not a hastily generated article.

## C. “Explore the investigations”

Your topic cards remain, but below the claim and current-event entry points.

They become:

> **Investigaciones en profundidad**

not the entire product.

# 3. Claims need a consistent page template

The site will become incoherent if every claim is written as a bespoke mini-article.

Each claim should follow the same cognitive sequence.

## Recommended claim-page structure

### 1. The claim

> “Los inmigrantes reciben más ayudas públicas que los españoles.”

Show the exact wording and common variants.

### 2. Direct conclusion

One of:

- Supported
- Mostly supported
- Depends on the definition
- Misleading
- Unsupported
- Contradicted
- Insufficient evidence
- Primarily a value judgment

Avoid a simplistic true/false scale. Many political claims mix a true observation with an unjustified causal conclusion.

### 3. Ten-second answer

Two or three sentences understandable without scrolling.

### 4. The part that is true

This is strategically important.

A user who believes the claim should immediately see that you are not hiding inconvenient evidence.

For example:

> Some benefits are disproportionately received by low-income households, and some immigrant groups have lower average incomes.

### 5. The missing context

Explain the denominator, comparison or causal leap.

### 6. What the evidence shows

Use two to four decisive charts or data points, not ten.

### 7. Competing explanations

Examples:

- demographic composition;
- income differences;
- eligibility rules;
- territorial concentration;
- administrative access;
- discrimination;
- selection effects.

Each explanation should have an evidence rating.

### 8. Why people believe it

This must be separate from whether the claim is accurate.

Possible factors:

- a real local experience;
- highly visible exceptional cases;
- viral videos;
- misunderstanding rates versus totals;
- institutional opacity;
- political amplification;
- outdated information.

This is one of the features that can distinguish your site from traditional fact-checking.

### 9. What we do not know

Explicit uncertainty.

### 10. What would change the conclusion

This makes the page falsifiable and credible.

### 11. Value disagreement

Where relevant:

> Even after agreeing on the evidence, people may disagree about eligibility rules because they prioritize different principles.

### 12. Sources and changes

- reviewed date;
- data cutoff;
- primary sources;
- revisions;
- correction history.

### 13. Shareable response

A natural answer for WhatsApp or social media.

### 14. Related claims

This creates continued exploration.

# 4. Stop duplicating evidence between claims

Hundreds of claims will produce unmanageable maintenance if every page contains manually copied statistics.

Suppose you have these claims:

- “Immigrants receive more benefits.”
- “Immigrants cost the welfare state more than they contribute.”
- “Irregular immigrants can receive the minimum income.”
- “Foreigners receive public housing first.”

They may all depend on the same objects:

- eligibility rules;
- benefit recipients by nationality;
- household-income distributions;
- foreign-born versus foreign-national definitions;
- tax and contribution estimates.

Store each piece of evidence once.

A conceptual model:

```ts
type Evidence = {
  id: string
  title: string
  finding: string
  metric?: string
  value?: number
  unit?: string
  geography: string
  period: string
  population: string
  source: Source
  methodology: string
  limitations: string[]
  quality: "high" | "medium" | "low"
  updatedAt: string
}
```

Claims then reference evidence IDs:

```ts
type Claim = {
  id: string
  statement: string
  shortAnswer: string
  assessment: Assessment
  evidenceFor: string[]
  evidenceAgainst: string[]
  contextEvidence: string[]
  explanations: Explanation[]
  relatedClaims: string[]
  investigations: string[]
}
```

This gives you three major benefits:

1. Update one statistic once.
2. Show exactly which claims may change when evidence changes.
3. Generate consistent charts and source references.

# 5. Claims must support multiple investigations

Do not force every claim into exactly one topic.

For example:

> “La inmigración está causando la crisis de vivienda.”

belongs to:

- Immigration
- Housing
- Economy and cost of living
- Possibly inequality

Similarly:

> “Las autonomías son responsible for excessive public spending.”

belongs to:

- Politics
- Taxes
- Territorial model
- Public services

Use one **primary investigation** plus multiple related investigations.

This avoids duplicating pages and reflects how political narratives actually work.

# 6. Replace the flat topic list with a claim graph

As the claim library grows, the important relationships are not just hierarchical.

Claims can relate through:

## Supports

> “The foreign population is younger”  
supports part of  
> “Immigration helps slow population ageing.”

## Contradicts

> “Most immigrants arrive irregularly”  
is contradicted by  
> legal-entry and residence data.

## Depends on

> “Immigrants commit more crime”  
depends on:
- definition of immigrant;
- crime measure;
- denominator;
- age and sex adjustment;
- geography.

## Often combined with

> “Immigrants receive more benefits”  
is often combined with  
> “Immigrants do not contribute.”

## Same mechanism

Claims about:

- healthcare saturation;
- school saturation;
- housing demand;

may share the mechanism:

> population growth occurs before public-service capacity adjusts.

## Different scale

- national effect;
- regional effect;
- municipal or neighbourhood effect.

The interface does not need to show a complicated graph visualization initially. But your data model should support it.

The user-facing version can simply say:

> **Para entender esta afirmación, también importa:**

and show three connected cards.

# 7. Create narrative pages above individual claims

Hundreds of claims often form a larger story.

For example:

## Narrative: “The state prioritizes foreigners over Spaniards”

It may contain:

- immigrants receive more benefits;
- immigrants get public housing first;
- irregular immigrants receive free healthcare unavailable to Spaniards;
- migrant minors receive thousands of euros;
- refugees receive more than pensioners.

A narrative page should explain:

- the central emotional proposition;
- claims used to support it;
- which claims contain real evidence;
- contradictions between versions;
- what legitimate concern it expresses;
- which policy disagreement remains after verification.

Other narratives:

- “Spain is becoming unsafe.”
- “Politicians live at citizens’ expense.”
- “Men are legally discriminated against.”
- “Brussels controls Spain.”
- “Climate policy is destroying ordinary people.”
- “Spain is being culturally replaced.”
- “The welfare state rewards those who do not work.”
- “The country’s institutions are captured.”

This gives you a hierarchy:

```text
Narrative
  ├── Claim 1
  ├── Claim 2
  ├── Claim 3
  └── Claim 4
```

Investigations explain a domain. Narratives explain a political interpretation. They are not the same thing.

# 8. Investigations should change format

Your investigations should no longer attempt to contain every claim in full.

Each investigation should provide:

## A. Executive diagnosis

What is happening?

## B. System map

Main actors, mechanisms and flows.

For housing:

```text
Housing supply
+ household formation
+ population change
+ credit
+ tourism
+ investment
+ regulation
→ prices and access
```

## C. Key indicators

A stable dashboard of the 8–12 most important measures.

## D. Main causal disagreements

Not a catalogue of political opinions, but competing models.

## E. Distributional effects

Who wins, who loses and where.

## F. Policy options

For each proposal:

- intended mechanism;
- supporting evidence;
- trade-offs;
- implementation constraints;
- likely beneficiaries;
- risks.

## G. Claim library

The investigation should list related claims with their status.

Example:

### Claims about immigration and employment

| Claim | Assessment | Updated |
|---|---|---|
| Immigrants take jobs from Spaniards | Depends on sector and period | July 2026 |
| Immigration lowers wages | Limited and concentrated effects | July 2026 |
| Spain needs immigrants to fill vacancies | Partially supported | June 2026 |

The detailed evidence lives on claim pages.

# 9. Introduce several user modes

Not everyone visiting the site wants the same depth.

You should support at least four modes.

## “Give me the answer”

For users arriving from search or social media.

- verdict;
- two-sentence explanation;
- one decisive chart.

## “Help me understand”

- causal models;
- context;
- uncertainty;
- related claims.

## “Show me the evidence”

- datasets;
- source extracts;
- methodology;
- calculation details;
- downloads.

## “Help me explain it”

- WhatsApp answer;
- conversation version;
- social graphic;
- common objection and response.

These modes can be tabs or progressively disclosed sections.

Your current design likely optimizes mainly for “help me understand.” Scaling requires all four.

# 10. Search becomes the core product

With 200 claims, ordinary text search is not enough.

A user may type:

- “paguita inmigrantes”
- “moros ayudas”
- “mena 4700 euros”
- “los extranjeros viven del estado”
- “ayudas solo para inmigrantes”

All may correspond to a small number of canonical claims.

You need:

## Claim aliases

Each claim should store:

- neutral formulation;
- colloquial variants;
- partisan wording;
- common misspellings;
- politician quotations;
- headline variants.

Example:

```ts
aliases: [
  "los inmigrantes reciben paguitas",
  "ayudas solo para extranjeros",
  "los menas cobran 4700 euros",
  "los inmigrantes viven de subvenciones"
]
```

## Intent search

Search should return:

1. exact or likely claim;
2. related investigation;
3. similar claims;
4. current events connected to it.

## Query gap tracking

Store anonymous unmatched search queries.

This becomes your editorial roadmap:

> Users searched 84 times for “paga menas” but no page matched well.

That tells you which claim to investigate next.

This may become the best source of product priorities.

# 11. Build a temporal layer

Claims change over time.

A claim may be:

- false nationally but true in a municipality;
- outdated after a legal reform;
- accurate in 2022 but not in 2026;
- based on preliminary data;
- resurrected during every election.

Every page needs:

- **current status**;
- **period evaluated**;
- **previous assessments**;
- **what changed**.

Example:

> **Current conclusion:** misleading  
> **Evaluated period:** 2023–2025  
> **Changed since 2024:** eligibility rules were modified.

Do not overwrite history. Maintain versions.

A public revision trail is one of the strongest possible trust mechanisms.

# 12. Separate facts, causality and policy

Many sites fail because they answer a policy question as if it were a factual verification.

For every claim, classify its type.

## Descriptive

> “Foreign nationals represent X% of convictions.”

Can be measured directly.

## Comparative

> “Spain taxes more than Europe.”

Requires definitions and peers.

## Causal

> “Immigration causes rents to rise.”

Requires a causal model.

## Predictive

> “The pension system will collapse.”

Requires assumptions and scenarios.

## Legal

> “An irregular migrant can receive this benefit.”

Depends on legal rules and implementation.

## Normative

> “Spanish citizens should receive priority.”

Cannot be proved true or false.

## Mixed

> “It is unfair that immigrants receive more aid.”

Contains both a factual premise and a value judgment.

The UI should tell users which kind of question they are looking at.

# 13. Add geographical resolution

National averages will increasingly become a weakness.

Many claims are experienced locally:

- crime;
- migration;
- school composition;
- rent;
- waiting lists;
- water scarcity;
- tourism;
- taxes;
- rural depopulation.

Every evidence object should carry geography:

- Spain;
- autonomous community;
- province;
- municipality;
- neighbourhood where available.

Then claim pages can say:

> **Nationally:** little evidence of a large effect.  
> **In rapidly growing municipalities:** pressure may be significant.  
> **Your region:** available indicators show…

This avoids invalidating local experiences with national averages.

But avoid launching a full municipal data portal immediately. Start with autonomous communities and major cities.

# 14. Do not let verdict labels become the product

A library of colored labels—true, false, misleading—will turn the site into another fact-checker.

The product’s advantage should be:

> **Understanding the structure of the disagreement.**

The verdict is useful, but secondary.

For example:

### Claim

“Immigration causes crime.”

### Better output

- There is a raw statistical disparity.
- The disparity varies strongly by age, sex, origin and offence.
- Raw rates cannot identify nationality as the cause.
- Some local concentrations can create real effects.
- Available Spanish data do not answer every adjusted comparison.
- Different policies can still be defended depending on risk tolerance.

That is far more intellectually honest and useful than a red “false” badge.

# 15. Create a clear editorial pipeline

With hundreds of claims, your main bottleneck will shift from coding to editorial maintenance.

You need a visible lifecycle.

```text
Candidate
→ Prioritized
→ Under investigation
→ Draft
→ Adversarial review
→ Published
→ Monitored
→ Updated or archived
```

Each claim should have an internal priority score based on:

- search demand;
- social circulation;
- potential harm;
- political relevance;
- evidence availability;
- current-event urgency;
- coverage gap;
- expected shelf life.

A possible formula:

```text
Priority =
  25% circulation
+ 20% user searches
+ 20% societal consequence
+ 15% evidence availability
+ 10% recurrence
+ 10% topical urgency
```

Do not merely investigate whatever went viral today. That can make your editorial agenda externally controlled by outrage actors.

Balance:

- current high-circulation claims;
- evergreen structural claims;
- claims from different ideological sources;
- underexamined claims with large policy consequences.

# 16. Trust architecture must become visible

As the site expands, users will increasingly ask:

- Who chose this claim?
- Why these sources?
- Who funds the site?
- Is this left-wing fact-checking?
- Why did you phrase the claim this way?
- Why did the verdict change?

You need visible trust components.

## On every page

- author or researcher;
- reviewer;
- reviewed date;
- source hierarchy;
- evidence quality;
- methodological limitations;
- correction button;
- version history.

## Site-wide

- editorial principles;
- funding;
- conflicts of interest;
- claim-selection policy;
- corrections policy;
- treatment of anonymous sources;
- use of AI;
- difference between direct data and inference.

The message should not be:

> “We are neutral.”

It should be:

> “You can inspect how we reached this conclusion.”

# 17. Use AI behind the interface, not as the authority

With hundreds of curated claims, AI becomes useful—but only as a router and composer.

Good uses:

- map user queries to canonical claims;
- retrieve related evidence;
- summarize at different reading levels;
- generate draft shareable responses;
- identify duplicated claims;
- suggest claim aliases;
- detect outdated evidence;
- identify conflicting figures;
- answer questions within the boundaries of your evidence base.

Bad uses:

- assign verdicts autonomously;
- invent evidence;
- produce unrestricted answers on uncovered topics;
- automatically publish current-event fact-checks;
- infer ideology or manipulate users based on political profile.

A useful architecture:

```text
User query
→ Claim retrieval
→ Evidence retrieval
→ Structured answer template
→ AI language generation
→ Citations and confidence check
```

The AI should not decide what is true. It should communicate the structured editorial work.

# 18. Distribution should be designed into every page

A site does not become an interpretation layer merely by existing.

Every claim needs export formats.

## WhatsApp

80–120 words, conversational, no institutional tone.

## X / Threads

One concise claim, qualification and source.

## Instagram / TikTok card

- claim;
- what is true;
- what is missing;
- QR or URL.

## Embed

A small card that journalists, bloggers and local sites can embed.

## Newsletter

Weekly selection of changed or newly circulating claims.

## Creator pack

- data;
- graphic;
- explanation;
- caveat;
- source list;
- suggested script.

This activates trusted people as distributors.

# 19. Add collections and guided paths

Hundreds of claims need editorial routes.

Examples:

## “Before discussing immigration”

A 10-minute path through five foundational distinctions:

- immigrant versus foreign national;
- regular versus irregular;
- stocks versus flows;
- totals versus rates;
- correlation versus causation.

## “Why young people cannot afford housing”

Claims about:

- supply;
- wages;
- mortgage conditions;
- tourism;
- immigration;
- investors;
- regulation.

## “What your taxes actually finance”

Claims about:

- pensions;
- healthcare;
- regional spending;
- political institutions;
- debt interest;
- subsidies.

## “Understanding violence against women”

Claims about:

- prevalence;
- judicial data;
- false complaints;
- foreign offenders;
- laws;
- prevention.

Guided collections provide a coherent experience without requiring the user to read an entire investigation.

# 20. The navigation I would use

A desktop navigation could be:

```text
Buscar
Claims
Investigaciones
En debate
Datos
Metodología
```

## Buscar

Primary action.

## Claims

Browsable claim library with filters:

- topic;
- assessment;
- evidence quality;
- geography;
- claim type;
- recently updated;
- most consulted.

## Investigaciones

Your full dossiers.

## En debate

Current events and trending narratives.

## Datos

Reusable charts, datasets and indicators.

## Metodología

Editorial process, sourcing and corrections.

Do not put 24 topic names in the top navigation.

# 21. What the topic page becomes

Each topic page should act as a hub, not merely the investigation text.

For example:

# Immigration

### Current diagnosis

A compact summary.

### Most consulted claims

- Does immigration increase crime?
- Do immigrants receive more benefits?
- Are most arrivals irregular?
- Does immigration raise rents?

### Current indicators

- foreign-born population;
- residence status;
- employment;
- irregular arrivals;
- asylum;
- demographic structure.

### Main narratives

- invasion;
- welfare preference;
- insecurity;
- labour replacement;
- cultural replacement.

### Full investigation

The long dossier.

### Recent changes

New data, laws and corrections.

This page serves both casual and expert visitors.

# 22. Avoid these scaling mistakes

## Mistake 1: Adding more cards to the homepage

Twenty-four cards are not a scalable product.

## Mistake 2: Creating one giant Markdown file per topic

That makes evidence duplication and updating inevitable.

## Mistake 3: Writing hundreds of claims before testing usage

Start with the claims users actually search and share.

## Mistake 4: Generating pages automatically with AI

You will gain volume but lose trust and differentiation.

## Mistake 5: Treating every political slogan as a factual claim

Some are identities, emotions or policy preferences.

## Mistake 6: Trying to cover every ideology symmetrically by count

Fairness does not mean publishing exactly 50 right-wing and 50 left-wing claims. Use consistent selection criteria.

## Mistake 7: Showing too much information by default

Your investigations are valuable, but most claim visitors need the 10-second layer first.

## Mistake 8: Building personalization too early

You do not yet need accounts, ideology profiles or customized feeds.

## Mistake 9: Letting topic overlap create duplicate content

Use shared evidence and cross-topic references.

## Mistake 10: Becoming only reactive

Maintain structural investigations alongside viral claims.

# 23. Recommended evolution in phases

## Phase 1 — Claim library

Goal: validate that people use and share claim pages.

Build:

- 30–50 claims;
- canonical page template;
- search and aliases;
- related claims;
- current investigations linked underneath;
- shareable answers;
- analytics for searches and shares.

Do not add AI chat yet.

## Phase 2 — Structured evidence

Goal: reduce maintenance costs and improve consistency.

Build:

- evidence object model;
- source registry;
- charts generated from evidence;
- claim-to-evidence relationships;
- update dates;
- revision history;
- evidence-quality labels.

## Phase 3 — Topic and narrative hubs

Goal: help people understand systems, not isolated facts.

Build:

- redesigned topic pages;
- narrative pages;
- guided collections;
- current indicators;
- cross-topic relationships.

## Phase 4 — Current-debate layer

Goal: create recurring use.

Build:

- “what is circulating”;
- weekly updates;
- event-to-claim mapping;
- newsletter or Telegram distribution;
- data-change alerts.

## Phase 5 — Retrieval assistant

Goal: accept arbitrary natural-language questions while remaining grounded.

Build:

- semantic retrieval;
- canonical claim matching;
- responses limited to reviewed evidence;
- explicit uncovered-question handling;
- citation and confidence enforcement.

## Phase 6 — External distribution

Goal: become infrastructure rather than only a destination.

Build:

- embeddable cards;
- public API;
- creator packs;
- journalist datasets;
- browser share extension;
- WhatsApp-friendly links.

# 24. What I would build next in your actual codebase

Based on the structure you previously showed—`claims.ts`, individual investigation files, quick answers, search and evidence-related data—you are already close to the right conceptual separation.

The next step should not be adding ten more long investigation files first.

I would make the claim system the central data model.

A target structure:

```text
src/data/
  claims/
    immigration/
      ayudas-publicas.ts
      delincuencia.ts
      vivienda.ts
    housing/
      rent-control.ts
      tourist-rentals.ts
    education/
      indoctrination.ts
      school-results.ts

  investigations/
    immigration.ts
    housing.ts
    education.ts

  evidence/
    ine/
    eurostat/
    ministries/
    judiciary/

  narratives/
    estado-prioriza-extranjeros.ts
    espana-insegura.ts
    impuestos-desperdiciados.ts

  sources/
    registry.ts

  collections/
    immigration-basics.ts
```

Each claim should be a structured TypeScript object, not an isolated Markdown essay.

The investigation can continue using your current rich editorial format, but it should reference claim IDs and evidence IDs.

# 25. The product identity should also evolve

“El País Está Fatal” is a strong emotional and memorable name. But as the site grows, the subtitle must explain the utility.

Possible positioning:

> **Las afirmaciones que definen el debate español, investigadas con datos y contexto.**

Or:

> **Busca lo que has oído. Comprueba qué sabemos, qué falta y por qué se discute.**

Or, most aligned with the product:

> **Pega una afirmación. Separamos el dato, la interpretación y lo que todavía no sabemos.**

The brand can remain provocative. The interaction should be precise and calm.

# My central recommendation

Do not think of the expanded site as:

> 24 topics containing 300 articles.

Think of it as:

> **A knowledge graph of Spanish public debate.**

Where:

- **claims** are the main user entry point;
- **investigations** explain complete systems;
- **evidence objects** provide traceability;
- **narratives** show how claims combine into worldviews;
- **events** provide timely distribution;
- **collections** create guided learning;
- **search** identifies user intent;
- **AI** retrieves and explains, but does not decide truth.

The most important immediate change is therefore not adding more topic cards. It is building one excellent, reusable claim-page system and making the homepage revolve around finding a claim. Once that works, the additional investigations become an advantage rather than a navigation burden.