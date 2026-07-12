# Roadmap QA record

Date: 2026-07-12

## Automated checks

The final implementation must pass:

```text
npm run audit:investigations
npm run audit:roadmap
npm run check
npm run build
npm run cards
git diff --check
```

`audit:roadmap` checks Spanish document language, title/description/canonical metadata, image alt attributes, local route references, exactly 14 concern pages, exactly 20 canonical affirmation pages, and legacy redirects.

## Local route smoke test

Using the local Astro server, these routes returned HTTP 200:

- `/`
- `/buscar`
- `/afirmaciones`
- `/afirmaciones/viviendas-vacias`
- `/preocupaciones/vivienda`
- `/robots.txt`
- `/sitemap.xml`

## Browser limitation

The in-app browser cannot access `127.0.0.1` in this environment because of an enterprise network policy. No policy workaround was used. Responsive visual QA must be repeated against the Cloudflare Pages preview or production URL once available; the static checks remain reproducible locally.

## Manual launch review still required

- Verify Cloudflare Pages Web Analytics is enabled or `PUBLIC_CF_WEB_ANALYTICS_TOKEN` is configured.
- Configure Cloudflare Zaraz actions for the emitted `search`, `share-response`, `download` and `copy-response` events if click reporting is desired.
- Review social previews and generated imagery after the deferred custom illustration batch.
- Check mobile widths 320/375/390, tablet and desktop in an accessible browser environment.
