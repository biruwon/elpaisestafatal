# Remaining implementation roadmap

Updated: 2026-07-12

The core product, responsive mobile-first behavior, claim/topic pages, search, sharing, tracking hooks, SEO and automated QA are implemented.

## Remaining work

### 0. Mobile features still not implemented

These items from the mobile plan remain optional follow-up work and should be implemented before declaring the mobile release fully complete:

- Full-screen viewer for dense charts and map-like visuals, with accessible summary, close control and landscape support.
- Contextual source preview sheets showing what each source supports and its main limitation before opening the external document.
- Progressive disclosure for long investigation chapters, secondary charts, regional tables, methodology and extended caveats.
- A full-screen mobile search overlay with automatic focus, popular claims on empty state and claims-before-topics ordering.
- A dedicated topic section bottom navigator with current-section state and browser-fragment navigation; the existing responsive reading-mode links are the current fallback.
- Chapter-level written takeaways and visible limitations beside every major visual.

Retention features—continue where you left off, recently viewed, bookmarks and PWA evaluation—remain intentionally postponed until the core mobile experience is validated.

### 1. Topic illustration assets

Generate the 14 square topic illustrations in a separate session. Do not generate them in this code session. The required paths and full prompts are preserved in the Git history of the previous roadmap commit; use the shared screen-print editorial style and save assets under `public/images/topics/`.

Required files:

```text
politica.png
vivienda.png
empleo.png
inmigracion.png
sanidad.png
economia.png
corrupcion.png
juventud.png
seguridad.png
impuestos.png
desigualdad.png
extremismos.png
problemas-sociales.png
crisis-valores.png
```

After adding them, connect the topic hero to `src/data/topicPresentation.ts`, verify decorative/meaningful alt treatment, and run the complete QA commands below.

Shared prompt:

```text
Square editorial illustration for a Spanish public-interest data investigation. Flat screen-print collage with geometric shapes, tactile paper grain, warm cream paper, deep blue, muted ochre and one restrained red accent. Thoughtful and analytical, never alarmist. No readable text, logos, flags, political branding, stereotypes, watermarks or photorealism. Keep the central subject clear with generous negative space and crisp edges for desktop and mobile cropping. The illustration is secondary to evidence.
```

Add one subject to the shared prompt for each file:

| File | Subject |
|---|---|
| `politica.png` | Civic square, abstract speech panels, parliament-like building and balanced scale for institutions and accountability. |
| `vivienda.png` | Dense apartment block, house key and restrained rising price line for access and affordability. |
| `empleo.png` | Worker at a crossroads between training and a modern workplace, with a subtle ladder or bridge for progression. |
| `inmigracion.png` | Diverse silhouettes crossing from rural landscape toward a city, suggesting routes, work and integration without boats or threat imagery. |
| `sanidad.png` | Public clinic, clock, waiting-room pathway and small medical cross for access and waiting times. |
| `economia.png` | Household table connected to factory, shop and transport line, with simple coins for production, prices and living standards. |
| `corrupcion.png` | Contract papers, courthouse column and transparent barrier between two hands for oversight, without literal bribes. |
| `juventud.png` | Young adult with backpack facing visual symbols for study, work, housing and independence. |
| `seguridad.png` | Ordinary urban street, lighting, phone with abstract shield and clear public route for street and digital safety. |
| `impuestos.png` | Receipt, household budget and public-service building connected by measured lines for the fiscal contract. |
| `desigualdad.png` | Unequal steps or platforms with education, housing and healthcare symbols for opportunity gaps. |
| `extremismos.png` | Divided conversation represented by branching speech shapes and a narrow bridge for polarization and democratic limits. |
| `problemas-sociales.png` | Interlocking homes, care hands and shared bench for cohesion, care and exclusion. |
| `crisis-valores.png` | Compass, shared street and diverging paths for civic norms and uncertainty, without moral judgement. |

### 2. Cloudflare production configuration

- Enable Cloudflare Web Analytics in the Pages project, or configure `PUBLIC_CF_WEB_ANALYTICS_TOKEN`.
- Configure Cloudflare Zaraz actions for the emitted `search`, `share-response`, `download` and `copy-response` events if click reporting is required.
- Confirm the privacy page matches the active Cloudflare configuration.

### 3. Preview/production visual QA

The in-app browser cannot reach localhost in the current environment. Repeat visual review against the Cloudflare preview or production URL at 320, 360, 375, 390, 430, 768 and desktop widths. Check Safari/Chrome mobile behavior, safe-area spacing, keyboard focus, sticky action bars, charts and redirects.

### 4. Final launch audit

```bash
npm run audit:investigations
npm run audit:roadmap
npm run check
npm run build
npm run cards
git diff --check
```

Verify 14 topics, 20 affirmations, canonical URLs, legacy redirects, source links, image paths, social previews and Cloudflare tracking in production.
