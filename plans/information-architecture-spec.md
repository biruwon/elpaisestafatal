# Information Architecture Specification v1.0

## Status

Approved

---

# Goal

The Information Architecture defines how users navigate El País Está Fatal.

The website should feel simple, predictable and easy to explore.

Users should naturally move from individual questions to broader understanding.

The architecture should minimise unnecessary navigation while encouraging exploration.

---

# Core Navigation Model

The website revolves around only three page types:

* Homepage
* Claim Page
* Topic Page

Everything else exists only to support navigation between these three destinations.

Avoid creating additional page types unless they provide clear value.

---

# Navigation Philosophy

Users rarely arrive wanting to study a complete topic.

Instead, they usually arrive with a specific question or claim.

Example:

"I've heard immigration increases crime."

The navigation should therefore guide users like this:

Homepage

↓

Claim Page

↓

Topic Page

↓

Related Claim

↓

Another Topic

The architecture encourages progressively building understanding instead of reading isolated articles.

---

# Primary Navigation

The main navigation should remain intentionally simple.

Recommended items:

* Inicio
* Buscar
* Acerca de

Avoid adding numerous menu entries or dropdowns.

The homepage already exposes the main concerns, making additional navigation unnecessary.

---

# Search

Search should be accessible from every page.

Desktop:

Persistent search field in the header.

Mobile:

Search icon opening a dedicated search interface.

Search should primarily return:

1. Claim Pages
2. Topic Pages

Claims should be prioritised because they match how users naturally formulate questions.

Example searches:

* inmigración
* alquiler
* impuestos
* vivienda
* paro juvenil

The search system should remain simple in the MVP and only search published content.

---

# Breadcrumbs

Claim Pages should display breadcrumbs.

Example:

Inicio

↓

Inmigración

↓

¿La inmigración aumenta la delincuencia?

Topic Pages should display:

Inicio

↓

Inmigración

Breadcrumbs help users understand context and improve navigation.

---

# Homepage Navigation

The homepage should present:

1. Hero
2. Search
3. Afirmaciones populares
4. Main concerns

Popular Claims remain the primary entry point.

The list of concerns provides broader exploration.

---

# Claim Page Navigation

Every Claim Page should link to:

* Parent topic.
* Four related claims.
* Other topics.

Related claims should prioritise conceptual relationships over simple keyword similarity.

Claims belonging to multiple topics should expose those relationships naturally.

---

# Topic Page Navigation

Every Topic Page should include:

* Popular claims within that topic.
* Deep investigation.
* Navigation to all other topics.

Topic Pages should encourage users to continue exploring other areas of Spain.

---

# Cross-Topic Navigation

Claims may belong to multiple topics.

Example:

"¿La inmigración aumenta el precio de la vivienda?"

Topics:

* Inmigración
* Vivienda

This allows users to naturally move between related concerns.

Cross-topic navigation should become one of the defining characteristics of the website.

---

# Internal Linking

Internal links should always help users answer their next question.

Examples:

Claim

↓

Related Claim

↓

Topic

↓

Another Topic

Avoid excessive or irrelevant linking.

Every suggested page should provide additional context.

---

# Footer

The footer should remain minimal.

Include:

* Acerca de
* Contacto

Avoid large collections of links or secondary navigation.

---

# Page Discovery

Users should discover content primarily through:

* Homepage
* Search
* Related claims
* Topic pages
* Search engines

The MVP does not require dedicated index pages for all claims or all topics.

---

# Scalability

The navigation should continue working even with hundreds of published Claim Pages.

Discovery should rely on:

* Search
* Related claims
* Topic pages
* Search engines

Not on large manually browsable indexes.

---

# Design Principles

Navigation should always feel:

* Predictable.
* Lightweight.
* Contextual.
* Progressive.

Avoid:

* Deep menu hierarchies.
* Nested categories.
* Complex dashboards.
* Large archives.
* Navigation that requires users to understand the site's structure before finding answers.

---

# User Journey

The intended exploration path is:

Homepage

↓

Popular Claim

↓

Claim Page

↓

Related Claim

↓

Topic Page

↓

Another Topic

↓

Homepage

Users should gradually build a broader understanding of Spain's major concerns through interconnected pages.

---

# Success Criteria

The Information Architecture succeeds when:

* Users quickly find answers to the questions that brought them to the website.
* Navigation feels intuitive without requiring explanation.
* Users naturally continue exploring related content.
* Claims provide the entry point.
* Topics provide the broader context.
* The architecture scales to hundreds of Claim Pages without becoming difficult to navigate.
