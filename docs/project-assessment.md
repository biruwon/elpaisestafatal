# Project assessment — 30 October 2026

## Decision

Keep Astro, Cloudflare Pages/D1, the reviewed content and the provider-neutral
local resolver. A framework rewrite would not address the main failures. The
necessary work is to make extraction, semantic fit, evidence freshness and
production ingestion agree end to end.

The product should offer a useful answer to every accepted submission, while
distinguishing a measured conclusion, a sourced explanation, a clarification
and an evidence gap. Accepting a claim does not make a binary verdict possible.

## What the review found and changed

| Finding | Implemented response |
| --- | --- |
| Different uploads could share a cache key made from filename, MIME and size. Text keys discarded punctuation significant to numbers. | Uploads and fetched pages bypass shared response caching. Text identity preserves exact numeric punctuation and clarification context; the cache is bounded. |
| Failed extraction could silently turn a caption into an answer about an unread file. Polling could restore the caption instead of the extracted claim. | A validated extraction envelope survives immediate and delayed responses. Partial or failed readings qualify the visible and copied answer. Users can inspect and correct the read text. |
| The interface supported only text, URL, image and optional audio. | Added PDF, DOCX, UTF-8 text/CSV/Markdown/JSON and short MP4/WebM/MOV video. Added a reproducible, offline speech setup and capability reporting. |
| Broad keyword routes could answer a precise measurement question with neighbouring topic statistics. | Scoped measurement requests bypass broad packets. Metric definitions have reviewed sources, numerators and denominators and a reusable explanation composer. Numeric/trend questions still require observations. |
| Any occurrence of an institutional label could inherit a response about Spain's current government. | Present-day institutional scope is checked. Historical, foreign and unrelated subjects do not inherit that evidence. A constitutional description is qualified as institutional context. |
| Missing numeric cells could become zero; fresh and stale rows could receive a fresh family label. | Missing values are rejected during parsing and selection. A measured zero is retained. Freshness and distinct series scopes are preserved conservatively. |
| A province count could be labelled with its autonomous community. Housing CSV column changes broke refresh. | Alias priority and quoted CSV parsing preserve the correct territory, month, administrative stage and numeric convention. Housing actions remain distinct from adjudicated people. |
| Specialist ingestion wrote records without the manifests read by the production exporter. Some scope/type metadata disappeared during D1 retrieval and ranking. | Domain ingestion now retains raw objects and manifests. Export/retrieval preserve geography, projection/budget status, legal stage, comparison metadata and source cadence. |
| One unavailable publisher stopped the public-source refresh. Large exports exhausted memory. The production D1 evidence table was empty when inspected. | Refresh records independent failures and continues. Latest-snapshot export and grouped import stream bounded data. A production mirror was loaded and its observation count checked. |
| Evidence could be distributed among compound propositions by position. | Proposition attribution requires an explicit evidence relationship. |

## Data state from this run

The initial local audit reported 187 stale metrics out of 194 registered metrics.
The full public refresh succeeded for all 143 resources then configured. Domain
refresh succeeded for 22 of 23 active feeds after repairing the housing parser.
The pension-transfer parser was also corrected for an official wording variant,
and a missing hospital-bed count feed was added with an explicit count unit.

The verified production mirror contains 634,323 observations from 178
sources with observations. The main import used 9,773 grouped statements in 12
batches; a small corrective import added the pension-transfer row and the newly
configured bed counts. Local raw snapshots retain more historical revisions than the production
index; these are not additional independent evidence.

The audit is an operational coverage report, not an accuracy score. In
particular, a model-assessed research lead or configured feed does not establish
that the complete user claim has been demonstrated. Consult the generated
reports for current per-metric readiness and limitations. The final local audit
registered 197 metrics, all with configured feeds: 181 ready, 10 stale, three
with data-quality gaps and three with partial domain evidence.

## Verification and practical limits

Regression checks exercise real PDF/DOCX parsing and video decoding, plus mocked
provider responses for deterministic API tests. An in-memory SQLite database
checks upload-demand deduplication and bulk SQL semantics. Definition questions
have paraphrase tests and nearby numeric/trend claims that must not cross-route.
Browser testing covers submission, visible extraction, sourced explanation and
correction. Separate live checks successfully read a Spanish image and
transcribed Spanish speech without losing its negation.

Files are limited to 8 MB, audio/video to two minutes, PDF reading to 20 pages,
and extracted text to 12,000 characters. Video uses up to four sampled frames
plus audio when available and is always labelled partial. A scanned PDF without
extractable text currently needs an image or pasted transcription. Automatic
reading can make mistakes; authenticity and speaker identity require separate
evidence.

The AIReF pension-projection workbook still fails TLS certificate-chain
verification from this runtime. Its source has not been marked refreshed. Some
derived rates and group-specific evidence also require further source work;
national counts, partial programme coverage and unmatched denominators must
continue to yield qualified explanations or explicit gaps.

## Ongoing product standard

Add evidence by measurement family and source contract. Store definitions,
denominators, population and methodological breaks with the metric, and keep
retrieval time separate from publication and measurement periods. Expand
definition metadata beyond the initial labour-market measures. Evaluate source
fit and unsupported conclusions alongside answer rate and latency. Promote
new claim families only with paraphrases and negative-neighbour tests; a large
catalogue or fluent answer is not a substitute for those checks.

## Text-answer follow-up — 30 October 2026

Text accuracy is the current priority. An audit of unverified, web-observed
claims found that broad topic packets sometimes answered a specific question
with a neighbouring indicator: for example, temporary contracts for a wage
question, house-purchase prices for rental supply, or hospital lists for GP
appointments. A compound question also linked government revenue to a separate
statement about perceived services because both contained the word “public”.

The resolver now uses reusable measurement contracts for frequent families,
distinguishes a directly relevant measure from context, and keeps a missing
measurement visible. Reviewed explanations of pension financing and electricity
markets carry their own sources and expiry. Compound propositions require an
explicit link or their own metric match; unrelated countries, populations and
units do not become one trend. Reviewed context packets also omit unasked
claims and approximate charts that could be mistaken for precise observations.
Exact submitted text, including negation and numeric punctuation, is preserved
in answer-cache identities. Semantic signatures remain useful for grouping
research demand but do not share an answer between different claims.

The model can propose research queries, but its unrestricted answer rewrite is
not used: checking only that a number or evidence ID appeared in a packet could
not establish that the rewritten statement preserved its meaning. Current-event
search results are labelled unconfirmed leads; a publisher's domain or several
search hits alone do not establish that the event or allegation was reported.

Two Eurostat poverty series and two measures from the first 2026 Health
Barometer wave were added to the refreshed warehouse. The latter distinguish
the proportion waiting over a day from the mean delay within that subgroup;
the survey wave is provisional and excludes mutualities with private care.
The production mirror contains 634,347 observations from 181 sources with
observations. The current coverage audit reports 201 configured metrics: 185
ready, 10 stale, three with data-quality failures and three with partial domain
evidence. These are operational checks, not a score for factual accuracy.

An exploratory run selected 24 varied discovery claims; six requests did not
complete within its time limit. A subsequent eight-claim run completed, and its
answers were inspected rather than scored merely for having sources. That
review still found a compound electricity explanation needing improvement;
the regression suite now tests that semantic boundary and neighbouring claims.
The suite also covers 33 measurement-family paraphrases, negative neighbours,
survey bases, absent values, mismatched locations and periods, and keeping a
specific result when a provisional topic answer was shown first. These checks
do not establish accuracy for every possible claim or replace source review.

Important remaining source work includes comparable wage-and-price series for
net pay and specific occupations or demographic groups, local rental
availability and the distribution of rental costs relative to earnings,
service-quality perceptions and their comparison with public revenue, and
evidence on private insurance and waiting times. When those measurements are
absent, the result must describe the gap rather than convert a nearby national
statistic into a verdict.

## Aligned wage and price evidence

The text resolver can compare an annual gross wage index per hour worked with
the annual average harmonised consumer price index for Spain. Both are sourced
from Eurostat: the wage series is the D11 component for NACE B–S of the
[annual labour cost index](https://ec.europa.eu/eurostat/cache/metadata/EN/lci_esms.htm),
and the price series is the all-items annual average HICP. The calculation
divides the wage-index growth factor (end value divided by start value) by the
price-index growth factor for the same years; it does not subtract or divide
percentage changes. For the 2020–2025
observations available on 30 October 2026, this yields an approximate 4.6%
decline, while the 2018–2025 comparison yields an approximate 1.0% increase.
Those are different periods, not contradictory results.

The series measures gross wages and salaries per hour for employees in
industry, construction and services. It excludes agriculture and household
employers, is not median or take-home pay, and may be affected by shifts in
employment composition. The HICP is a harmonised price index, not a complete
cost-of-living index for each household. The comparison cannot establish that
each worker or every year had the same experience, or attribute causes. The resolver requires matching
annual periods, a consistent source revision and valid source flags; a missing
year or a break in the series prevents a numeric comparison. It does not apply
the aggregate result as a direct answer about a particular sex, age, occupation,
minimum wage, net pay, foreign country or locality.
