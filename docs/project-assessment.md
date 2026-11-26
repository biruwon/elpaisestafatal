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

## Text and source operations follow-up — 15 November 2026

Broad claims about the availability of work were reaching an employment-quality
packet led by temporary-contract rates. The focused response now distinguishes
finding a job from the share of employees on temporary contracts and treats an
overall unemployment rate as context, not a count of vacancies. Claims about a
particular contract or salary do not receive an all-worker rate as a substitute.
Independent propositions are kept from being collapsed into this one answer.

The protected-housing source changed its CSV column names. Its current format is
now parsed with province, month and administrative stage preserved. The
production monitor now targets the public site and waits for queued responses;
the refresh job reports missing credentials and can synchronize valid snapshots
even when other sources or coverage checks fail. At inspection, the scheduled
job had no Cloudflare credentials, so it had not refreshed the production
warehouse. The two Eurostat wage/price sources were fetched again and their
existing production records were marked retrieved on 15 November only after
their source hashes and 16 observations each matched. Complete automatic data
refresh still requires configured credentials and repair of the remaining
unavailable feeds; historical failures have not been treated as successful.

## Youth affordability fallback — 16 November 2026

A generic focused affordability gap could hide reviewed national youth-housing
evidence when the offline text fallback had no observations. The fallback now
uses the reviewed family only when its matching CJE evidence is present, and
adds a claim-specific gap for the population distribution or household support
that the averages do not measure. Rental comparisons retain the full-dwelling
scope and individual-salary denominator. Purchase comparisons state that the
€66,900 entry estimate equals 4.7 years of the CJE's reference annual youth
salary only if the entire salary were devoted to it; this is not observed
savings time or a count of households able to buy. The
[CJE's 2025 Observatory](https://www.cje.org/observatorio_2025/) reports
these figures, while the [INE's 2025 Living Conditions Survey](https://www.ine.es/dyngs/Prensa/es/m3ECV2025.htm)
reports that 47.3% of people
aged 26–34 already living with their parents cited inability to afford buying
or renting as their main reason. That response does not measure the effect of
family support or inheritance.

The 300-item web-observed corpus is explicitly unverified and was used only as
a deterministic-fallback routing audit. Four submissions returned a
`complete` API status with limited evidence, 296 remained uncovered and 28 had
any source or evidence attached. These counts measure routing and source
attachment only; they cannot establish factual accuracy or full
production-resolver performance. Adult, Madrid-specific, Portugal and monthly
mortgage-payment claims keep their separate scope or measurement gaps.

## Uncovered text and multi-part claims — 16 November 2026

The fallback previously turned an uncovered sentence into one undifferentiated
argument. For claims with multiple explicit clauses, it now preserves the full
statement and shows each clause separately. A causal statement remains visible
as a whole, and the missing-evidence request includes the causal link. Every
item remains insufficient and has no attached evidence or sources. The result
screen labels this as what is missing to check each part. The API-only
deterministic fallback keeps its conservative 300-character bound and says
when later text was not checked. The local resolver uses a separate full-text
parser window of 4,000 characters. Longer text is accepted by the form but
stops with an explicit insufficient-evidence response instead of routing on a
prefix. The form states this analysis limit.

The claim parser also recognizes inflected Spanish future-tense verbs as
predictions, so the fallback asks for a forecast horizon and published
assumptions rather than treating a future claim as a present-day measurement.
A present-tense employment claim remains in its own family.

The unverified 300-claim audit distinguishes 111 parser outputs, which include
synthetic evidence requirements, from 43 submissions with multiple explicit
clauses. The fallback now structures 40 of those; the other three matched
measurement-specific evidence-gap plans, which preserve the whole question and
its limitation as one assessment. Four submissions still return complete API
status with limited evidence, 296 remain uncovered and 28 have any evidence or
source attached. These counts describe routing and answer structure only, not
truth or factual accuracy.

## Adjacent text-claim routing — 16 November 2026

A live local-resolver probe found two answer-quality failures among related
housing claims. A statement that full-time work no longer guarantees living
independently was answered with temporary-contract and unemployment trends,
which do not measure housing independence. A claim that nonresident foreign
home purchases raise coastal prices was paired with national housing prices and
immigration population counts, which do not establish buyer residence or a
causal effect.

The text route now gives these claims reusable measurement contracts. The
full-time-work family asks for housing outcomes, net income and housing costs
for the same population, place and period; rent and purchase-price indices can
appear only as context. The housing-cause family separates nonresident purchase
claims from claims about population growth. The first requires transaction
records by buyer residence and local price data; the second requires local
population flows, housing supply and prices. Both require a causal comparison
and keep nationality, country of birth and residence distinct. Paraphrase tests
cover these families, with nearby work-poverty, nonresident-count,
coastal-price and tourist-housing claims kept in their own routes. They remain
explicitly insufficient until compatible observations are available.

The deterministic audit recognizes metric-family routes for 84 of the 300
unverified discovery claims. A recognized family does not itself mean the
evidence warehouse contains a matching observation.

## Text retrieval latency — 16 November 2026

The public health endpoint and the local resolver reported the same process
telemetry after 33 completed text requests: 52.9 seconds p95 end-to-end,
32.1 seconds p95 in warehouse retrieval and 51.3 seconds p95 in retrieval and
answer composition. These are observations from that resolver process, not a
site-wide benchmark. The local file warehouse contained 945 record files
(2.2 GB) and 938 manifests (3.7 MB), but the search code looked one directory
above the actual manifest directory. Retrieval therefore missed the metric
and source-token index and could parse up to 50,000 records from an unfiltered
file list on a cache miss.

The resolver now reads manifests beside the record files, narrows metric
lookups by metric ID and source aliases, and avoids scanning the full archive
when the manifest index covers at least 90% of files but has no match. Domain
manifests record the metric IDs they contain. On this local warehouse, the
existing housing-price lookup took 1.225 seconds cold and 0.130 seconds warm;
a synthetic no-match lookup returned no observations in 1.222 seconds. These
measure the file-search step only. End-to-end production latency still needs
to be remeasured after the resolver process reloads and accumulates new
requests.

## Education-to-work text claims — 16 November 2026

The education-employment claim family previously attached a reviewed 2025
overqualification percentage from a static answer snapshot. It now retrieves
annual Eurostat observations for employment, unemployment and overqualification
among people aged 20–64 with tertiary education (ISCED 2011 levels 5–8).
The employment rate uses all residents in that age and education group as its
denominator; the unemployment rate uses their labour force; the
overqualification rate uses only those already employed. Eurostat defines
overqualification by occupation groups that do not require tertiary education
([dataset](https://ec.europa.eu/eurostat/databrowser/view/lfsa_eoqgan/default/table?lang=en),
[methodology](https://ec.europa.eu/eurostat/web/skills/methodology)).

The three Eurostat feeds refreshed successfully into the local warehouse, with
11 annual observations each for 2015–2025. The local answer composer now reads
the 2025 values from those records (83.2% employed and 34.0% overqualified)
and carries their observation flags into the response. Eurostat marks these
2025 observations with a definition-difference flag and marks a 2021 series
break for the employment and overqualification series. The composer therefore
shows the latest observations but does not claim a rise or fall from them.
These group rates do not establish an individual guarantee, recent-graduate
outcomes, field-of-study match or employer requirements for a master's degree.

The family keeps unemployment, employment and job-fit questions distinct.
Recent-graduate claims, comparisons with vocational qualifications,
cross-country requests, and claims about advertised degree requirements remain
evidence gaps because these feeds do not measure those populations or outcomes.
Paraphrases route to the relevant measure; adjacent groups and comparisons are
kept out of scope.

The text metric router now applies the same scope distinctions across the
broader catalogue: comparison geography, nationality, denominator, urbanisation,
sex, legal stage, and aggregate versus per-person units. The 490-input retrieval
benchmark resolves the expected metric within the top three for 463 of 479
supported formulations, rejects all 11 unsupported formulations, and produces
zero top matches marked incompatible with the expected measure. This benchmark
checks metric routing, not end-to-end factual accuracy. A per-person final-energy
comparison remains unsupported because the registry contains only aggregate
energy totals; those totals are kept out of the answer path.

## Text claim routing and source fit — 17 November 2026

A second review of all 300 unverified discovery candidates found cross-topic
routes that could attach plausible but irrelevant statistics: entry-level
salary claims selected home-purchase data; returns on housing investment could
fall into small-business closure claims; pay differences by education or public
and private sector could select an overqualification rate; and a pension
indexation claim could select general wage and price series. A claim about
housing costs, contributions and family formation could also receive a youth
housing answer that did not measure savings or having children.

Text interpretation now separates those reusable claim families, along with
regional wage and housing-cost comparisons, firm productivity and pay,
unpaid overtime, wage progression, pension contribution bases, pension
financing, private retirement saving and workers per pensioner. Compound
causal clauses that belong to one family can use that family's evidence plan;
separate topics retain their own scope. Where the warehouse does not contain
the required compatible measures, these routes return an evidence gap without
substituting nearby national wages, housing indices or age-dependency ratios.

The broad tax packet also attached wage-tax, VAT and pension projections to a
specific question about inflation and unadjusted income-tax parameters. The
focused answer now uses the Banco de España estimate for that mechanism alone:
its 1.85% IRPF revenue response is a modeled result for a homogeneous 1% income
increase without parameter updates, while the estimated contribution to the
IRPF/GDP rise refers to 2019–2023. Neither figure is presented as the amount
every household paid or as a measure of all taxes.

The latest deterministic fallback audit returns three `complete`, 15 `limited`
and 282 `uncovered` results. Eighteen claims have attached evidence, eighteen
have source links, and 36 return structured compound responses; metric-family
routes cover 84 candidates. These are routing and answer-structure counts, not
an accuracy score: all 300 inputs remain unverified, the audit does not
exercise every live production path, and a family match does not establish
that evidence is available. The focused claim suite checks 189 paraphrases and
nearby claims; the remaining gaps require source work before they can receive
numeric answers.

## Employer skills and course-content claims — 17 November 2026

A claim that languages and digital skills matter more to employers than
university course content previously could inherit a tertiary-employment
percentage. The text router now treats this as its own comparative claim
family and explains the missing evidence: comparable job-vacancy skill
requirements, course objectives and content, and a defined employment outcome
for the same occupations, place and period. The 83.2% tertiary employment rate
does not measure those comparisons, so it is kept out of the answer. Paraphrases
use the same evidence requirements while graduate employment-rate questions
remain in their separate family.

## Youth rental reply readability — 17 November 2026

The public text fallback now keeps broad youth-rent replies under 160 words
and selects only figures needed to distinguish the main measures. It reports
the CJE's 2025 full-dwelling rent against a reference individual youth salary,
then the Banco de España's 2024 average rent share among renter households
whose reference person is up to 35 and the share of non-owner households in
that group above 30%. The reply explains that the first is not an individual's
observed rent and the latter measures households, so neither gives the share
of young people spending more than half of their personal salary. It leaves
the Banco de España's hypothetical two-young-person city scenario out of the
general answer. The [CJE release](https://www.cje.org/observatorio_2025/),
[Banco de España Annual Report 2025](https://www.bde.es/f/webbe/SES/Secciones/Publicaciones/PublicacionesAnuales/InformesAnuales/25/InfAnual_2025.pdf)
and the [INE's 2025 Living Conditions Survey](https://www.ine.es/dyngs/Prensa/es/m3ECV2025.htm)
remain attached to their respective findings. The fallback does not use these
figures as evidence for causal claims about wages, family transfers or
emigration.

## Pension indexation text claims — 17 November 2026

Claims about whether public pensions rise with prices had no direct text answer
even though the annual legal revaluation decisions publish both the general
percentage and its relation to the reference CPI. A reusable pension-price
indexation family now reports the general contributory-pension increases for
2022–2026: 2.5%, 8.5%, 3.8%, 2.8% and 2.7%, linked to the annual CPI reference
in the relevant official rules. Each year links to its BOE decision.

This answers the statutory revaluation question; it does not claim that every
retiree's household kept the same purchasing power. Minimum amounts and some
benefits can follow different rules, and the snapshot expires before the 2027
decision is due. Claims comparing pension increases with wage growth keep their
separate evidence gap because this rate series does not measure wages.

Focused measurement plans now label explicitly reviewed, source-backed findings
as partial. Related observations that do not measure the full claim remain
insufficient for that claim; the top-level answer can still explain them as
context. The pension projection router also distinguishes the current year
from years still in the future, so a published current-year increase does not
inherit a forecast-only explanation.

## Wage purchasing-power text claims — 17 November 2026

The text resolver can compare Eurostat's annual gross-wage-per-hour index for
industry, construction and services with the HICP annual average index for all
consumer prices. Both series now run through 2025. From 2020 to 2025 the wage
index rose 16.3% while prices rose 21.9%, a 4.6% fall in the wage index after
price adjustment. From 2022 to 2025 that adjusted index rose 3.0%, so the
endpoint comparison depends on the period and does not show a decline in every
year. [Eurostat wage index](https://ec.europa.eu/eurostat/databrowser/view/lc_lci_r2_a/default/table?lang=en), [Eurostat HICP annual index](https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_ainr/default/table?lang=en).

The answer now reports this calculation as a partial finding instead of
“insufficient evidence.” It keeps the source population and limitations
visible: this is a gross hourly index, not net or median pay or each worker's
salary, and HICP does not measure an individual household's basket. The answer
also shows the recent positive comparison so a broad claim does not imply that
real wages fell throughout the full period.

## Industrial electricity and wage-cost claims — 17 November 2026

A read-only warehouse pass over the 300 unverified discovery claims found that
an industrial competitiveness claim and an hourly export/import claim could
receive the household electricity-price series. A separate claim that higher
hospitality wages would force price rises or lower margins could receive
national wage and consumer-price indexes. Those measurements do not establish
the claims' industrial, hourly-flow or business pass-through propositions.

Text routing now separates those three reusable claim families. Their answers
explain which measurements are missing. The industrial-price route now uses
Eurostat's non-household electricity series for band ID (2,000 to less than
20,000 MWh a year), with VAT and recoverable taxes excluded. It can show a
same-period Spain/EU price comparison when the claim asks for one, but the
average is grouped by annual consumption rather than sector and cannot establish
an effect on industry-wide costs or competitiveness. [Eurostat nrg_pc_205](https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_205/default/table?lang=en), [European Commission definition of band ID and tax treatment](https://single-market-scoreboard.ec.europa.eu/node/699_el).

The live 2026-S1 observations in that band are €0.1177/kWh for Spain and
€0.1559/kWh for the EU-27, a difference of €0.0382/kWh. These values are
shown only for a question that asks for this industrial-consumer band or its
Spain/EU comparison.

The hourly export/import claim still lacks cross-border electricity flows
aligned with hourly wholesale prices. The wage-price claim still lacks labor
costs aligned with business prices and margins. Those causal conclusions remain
open; the household tariff, broad wage index and HICP cannot fill them.

## Text evidence-store outages — 17 November 2026

A focused claim can be missing a compatible observation, or the data store can
be unreachable. These cases now have different public outcomes: a successful
search with no compatible rows can explain the evidence gap; a missing D1
binding or failed read says the statistical series could not be checked and
invites a retry. This avoids presenting an infrastructure failure as evidence
that the needed data do not exist. The real-wage API validation covers absent,
failed and successful-empty lookups.

## Text-answer readability and measurement gaps — 17 November 2026

A fresh deterministic audit inspected the replies to all 300 unverified
web-observed text claims. Every reply was under 160 words; the longest was 158.
Three related sector-and-wage claims had previously received nearly identical
replies of about 240 words. Their reusable answer family now adds the specific
missing measure requested by the wording: employment by activity and period
for employment comparisons, sector pay and employment weights for claims that
an activity lowers the national wage average, and same-sector value added for
GDP comparisons. The Eurostat wage-structure survey remains labelled as salary
context (gross pay, 2022 reference, four-year collection and enterprise
coverage); it is not presented as a productivity or employment-growth series.

The same pass shortened the rental-affordability and future-pension replies,
while preserving the renter population, rental-income denominator, cohort and
projection limits. A compound claim about young people paying into the system
and receiving lower pensions now also requests projected contributions and
benefits for the same cohort and working life.

The reply-length result does not measure factual accuracy. The 300 claims are
still unverified discovery inputs; the deterministic fallback returned three
`complete`, 15 `limited` and 282 `uncovered` results after this change.

A new text feed now imports Eurostat's 2022 mean gross hourly earnings by NACE
activity. The local ingestion produced 29 rows, including aggregate and
one-letter activity codes. With the all-sexes, gross-earnings, total-service,
10-or-more-employees and Spain filters, the source reports €9.86 per hour for
accommodation and food services (NACE I), €16.75 for information and
communications (J), €20.35 for finance and insurance (K), and €13.52 for
manufacturing (C). [Eurostat dataset](https://ec.europa.eu/eurostat/databrowser/product/page/earn_ses22_17).

The text resolver now uses only the activity names present in a claim. It
labels NACE I as accommodation and food services rather than all tourism, and
keeps these averages as limited context. They do not show the share or number of
high-wage jobs, productivity, employment growth, or an activity's contribution
to the national wage average. Eurostat's survey is four-yearly; Spain's quality
report documents that agriculture is excluded and public administration is
only partly covered. [Eurostat SES 2022 metadata](https://ec.europa.eu/eurostat/cache/metadata/en/earn_ses2022_esms.htm),
[Spain quality report](https://ec.europa.eu/eurostat/cache/metadata/EN/earn_ses2022_esqrs_es.htm).

The focused claim suite now checks 189 existing paraphrases and nearby cases,
plus sector-wage paraphrases that must select the same NACE rows and nearby
productivity or wage-trend claims that must not inherit those rows.

## Full-time work and housing independence — 17 November 2026

The claim that full-time work no longer guarantees independent housing was
receiving national rent and home-price indexes. Those describe price changes,
not the share of full-time workers living independently, so the focused answer
no longer attaches them.

The reply gives two useful but distinct pieces of context. The CJE
reports a 14.5% general youth-emancipation rate for Spain in 2025 and defines
its main youth population as ages 16–29. The INE reports that 44.3% of people
aged 26–34 in Spain lived with their parents in 2025; among that group, 47.3%
named being unable to afford to rent or buy as their main reason. The CJE rate does not
isolate full-time workers, and the INE's stated reason is self-reported and not
broken down by employment hours. [CJE 2025 report](https://www.cje.org/ca/observatorio_2025/),
[CJE population and methodology](https://www.cje.org/observatorio-de-emancipacion/),
[INE ECV 2025 housing-access module](https://www.ine.es/dyngs/Prensa/es/m3ECV2025.htm).

The public verdict remains insufficient: these figures do not establish a rate
for full-time workers or a trend over time in that group's housing situation.
Paraphrase checks require the same CJE and INE evidence while nearby
poverty-only and youth rent-burden claims stay on their own measures.

On the 300 still-unverified text claims, the deterministic audit now reports
three complete, 16 limited and 281 uncovered answers, with 83 metric-routed
claims. The full-time housing claim moved from uncovered to limited context;
its public verdict remains insufficient. These are coverage and routing
counts, not a measurement of factual accuracy.

## Foreign-buyer housing claims — 17 November 2026

A live housing-claim audit could not resolve its foreign-buyer claim because
that request failed at the local resolver. The failure was not treated as
evidence that no data exist. The Colegio de Registradores' third-quarter 2026
report provides a useful, narrower measure: buyers of foreign nationality made
16.05% of registered home purchases in Spain, 46.46% in Alicante province and
38.83% in Málaga province. The same report says its deeds record nationality,
not residence, so it cannot separate foreign residents from non-residents.
[Registradores, Q3 2026 report](https://www.registradores.org/documents/d/guest/eri_3t_2026).

The focused text fallback now attaches that primary source as context for the
reusable foreign-purchase-and-price claim family. It explains that the purchase
shares describe transactions and do not establish that buyers raised local
prices. The answer keeps the public verdict insufficient and asks for purchase
and price measures in the same local markets and periods plus a causal
comparison that accounts for supply, demand, tourism and financing. Paraphrases
must use the same source and figures; migration-and-rent, tourist-housing and
descriptive nationality questions remain on separate routes. The source
snapshot expires for review on 31 March 2027.

## Unemployment and wage-bargaining claims — 17 November 2026

The broad claim that structural unemployment lets employers hold down wages
because candidates are always available previously fell into a general salary
route. It now receives context from two Banco de España working papers. One
study estimated that a 1 percentage-point rise in local unemployment was
associated with a roughly 0.45 percentage-point fall in mean wages among metal
workers in Spain and Italy from 2005 to 2013. A separate study of Spanish worker
records from 1987 to 2013 found weak, asymmetric wage responses over the business
cycle: higher unemployment did not produce additional real-wage adjustments in
recessions, and new hires were more sensitive to the cycle than workers with
over six years' tenure. [Working Paper 2036](https://www.bde.es/wbe/en/publicaciones/analisis-economico-investigacion/documentos-trabajo/wage-determination-and-bite-collective-contracts-italy-and-spain-evidence-from-metal-working-industry.html),
[Working Paper 1504](https://www.bde.es/wbe/en/publicaciones/analisis-economico-investigacion/documentos-trabajo/real-wage-responsiveness-to-unemployment-spain-asymmetries-along-business-cycle.html).

The first study's English and Spanish abstracts show different decimal values
for a separate estimate around collective-agreement renewal, so the answer does
not repeat that disputed figure. The retained estimate and both studies are
explicitly scoped to their populations, places and historical periods. They do
not measure current structural unemployment, the number of applicants for each
vacancy or all employers' wage-setting decisions. The result is limited
historical context; the public verdict remains insufficient, with a request for
local or sector-level unemployment and pay measures and evidence about candidate
supply in the same labor markets and periods. Paraphrases share these sources;
direct unemployment rates, migration-related wage effects, matched-profile pay
and real-wage claims remain separate routes.

## Text claim breakdown in public answers — 17 November 2026

The resolver and Pages response already retained claim-by-claim assessments,
but the local preview mapper dropped them and the next clarification question.
Both public paths now use one mapper for per-part verdicts, findings and
explicitly attributed sources. It does not create per-part verdicts
when a plan only contains a list of clauses without a finding or evidence link.
Context-only evidence remains unattached to the claim's direct assessment.

Regression checks cover two paraphrases of a multi-part tax-and-services
claim, a nearby single-part claim, an unassessed clause list, and a context-only
poverty measure. The two public paths agree on per-claim verdict and source
attribution. The refreshed 300-claim deterministic fallback audit reports
three complete, 18 limited and 279 uncovered replies, with 82 metric-routed
claims. These are fallback coverage counts, not factual-accuracy results or a
measure of the dynamic resolver.

## Working-poverty text evidence — 17 November 2026

The text fallback now carries reviewed 2015–2025 Spain series for the overall,
full-time and part-time in-work at-risk-of-poverty rates. The existing warehouse
refresh configuration also includes separate queries for each measure. In
the Pages text endpoint, a successful D1 lookup with no rows now uses this
reviewed snapshot; a failed D1 lookup remains unavailable, and warehouse rows
continue through the warehouse evidence plan.
2025, the overall rate was 11.2% among employed people aged 18 or over who
worked more than half of the reference year. Eurostat's full-/part-time split
reported 9.5% for full-time workers and 18.6% for part-time workers; that
dataset does not provide an age dimension. The split-by-hours values come from
Eurostat's
[full-/part-time dataset](https://ec.europa.eu/eurostat/databrowser/view/ilc_iw07/default/table?lang=en);
the overall series comes from [ilc_iw01](https://ec.europa.eu/eurostat/databrowser/view/ilc_iw01/default/table?lang=en).

These rates use household equivalised disposable income below 60% of the
national median after social transfers. They do not measure an individual
worker's salary or directly ask whether the household can make ends meet. The
series period is the EU-SILC survey year, while its income reference year may
be earlier. Claims about the number of affected people remain unresolved by a
rate because the employed population can change. The text fallback gives the
part-time and full-time groups their own metric, source, denominator and
population checks; it cannot route one group's value to the other.
For 2025, the part-time rate was 9.1 percentage points higher than the
full-time rate. That same-period comparison describes a difference between
groups; it does not show that working time caused it. The full-/part-time table
does not provide an age dimension, so age-specific claims remain outside this
evidence.

Trend replies compare endpoints from one annual series and note when the
intervening years rose and fell. From 2015 to 2025, the overall rate fell from
13.1% to 11.2% (1.9 percentage points), the full-time rate from 10.3% to 9.5%
(0.8 points), and the part-time rate from 27.1% to 18.6% (8.5 points). These
endpoint comparisons do not establish a continuous decline or explain its
cause. The fallback snapshot is reviewed through 30 April 2027; after expiry
it supplies no observations until reviewed again.

The matching item in the unverified 300-claim corpus says full-time work may
still fail to make ends meet. It now receives the 9.5% full-time rate as clearly
labelled context and asks for a direct measure of declared difficulty; the
claim remains uncovered and the contextual source is not attached as direct
proof. The audit remains at three complete, 18 limited and 279 uncovered
fallback replies. Those status counts do not capture this improvement in
explanation quality and are not an accuracy score. Paraphrases use the same
work-hour-specific series; absolute headcounts, subjective affordability,
nearby housing independence and foreign-country claims remain outside those
series' direct scope.

## Unemployment and wage-pressure replies — 17 November 2026

The unemployment-and-wages family now gives a shorter, source-scoped summary.
It keeps the Banco de España metal-worker estimate for Spain and Italy
(2005–2013) separate from the Spanish administrative-worker study (1987–2013),
and labels both as historical context. Neither measures current structural
unemployment, candidates per vacancy or the pay policies of all firms. See
[Working Paper 2036](https://www.bde.es/wbe/en/publicaciones/analisis-economico-investigacion/documentos-trabajo/wage-determination-and-bite-collective-contracts-italy-and-spain-evidence-from-metal-working-industry.html)
and [Working Paper 1504](https://www.bde.es/wbe/en/publicaciones/analisis-economico-investigacion/documentos-trabajo/real-wage-responsiveness-to-unemployment-spain-asymmetries-along-business-cycle.html).

In the deterministic audit of the 300 unverified discovery claims, this reply
fell from 254 to 151 words; all 300 replies are now under 160 words. This is a
readability check on the fallback, not a factual-accuracy score or a result for
the dynamic resolver.

## Tertiary education and employment text fallback — 17 November 2026

The text-only fallback now uses four reviewed 2025 Eurostat observations for
Spain when the successful warehouse lookup has no matching rows. For residents
aged 20–64 with tertiary education (ISCED 2011 levels 5–8), the employment rate
was 83.2%; the unemployment rate was 6.4% of the active population. Among
employed people with tertiary education, the overqualification rate was 34.0%
for ages 20–64 and 34.4% for ages 20–34. Eurostat defines overqualification
here as working in an occupation in ISCO groups 4–9. Sources are the official
[employment](https://ec.europa.eu/eurostat/databrowser/view/lfsa_ergaedn/default/table?lang=en),
[unemployment](https://ec.europa.eu/eurostat/databrowser/view/une_educ_a/default/table?lang=en)
and [overqualification](https://ec.europa.eu/eurostat/databrowser/view/lfsa_eoqgan/default/table?lang=en)
tables.

All four 2025 observations carry Eurostat's `d` status: the definition differs
from earlier years. The fallback therefore reports a latest-year observation,
not a time trend. Employment is divided by all residents in the age and
education group; unemployment is divided by the active population in that
group; overqualification is divided only by employed people in its age group.
The two overqualification rates are not interchangeable, and the younger
measure does not mean “recent graduates.” These group rates do not establish
that a degree guarantees or fails to guarantee a suitable job for an individual,
match a job to a person's field of study, compare university with vocational
training, or measure employers' requirements in job advertisements. Those
questions need distinct evidence. A successful empty D1 lookup may use this
dated fallback; a failed lookup remains unavailable, and matching warehouse
observations remain the primary path. The reviewed snapshot expires on 30 April
2027.

Regression checks cover paraphrases of graduate employment and unemployment,
age-specific overqualification, and nearby vocational-training, master's-
requirement and employer-skills claims that must not inherit these rates. The
tests also preserve the source flags and ensure an unavailable warehouse is
not treated as proof that evidence is absent.

## Text answers explain evidence gaps — 17 November 2026

The fallback compiler already records the evidence needed for unsupported
claims, including separate requirements for causal claims, forecasts, legal
questions and compound statements. The public answer had been dropping that
structure and returning the same generic response for many of them. A shared
composer now puts the evidence boundary, the missing measurement and the next
check into the answer. The local preview and Pages API use the same composer;
the response cache version was advanced so a warm Worker cannot keep the old
copy.

In the deterministic audit of 300 unverified discovery claims, 206 replies
that had previously shown only the generic gap now include a claim-specific
evidence requirement and next step. The median reply is 59 words, the 90th
percentile is 109 and the longest is 158; all stay below 160 words. The audit
still reports three complete, 21 limited and 276 uncovered replies. This is a
readability and response-structure improvement, not new evidence, a factual
accuracy score or a result for the dynamic resolver. The candidate claims
remain unverified. Regression checks confirm that causal paraphrases share the
same gap and a nearby descriptive comparison does not inherit causal
requirements.

## Primary-care appointment waits from the latest available wave — 23 November 2026

The Ministry of Health has published the Barómetro Sanitario 2026 second wave.
Its workbook renamed the results sheet from `Marginales` to `Resultados`, which
made the existing connector fail. The reusable parser now accepts either sheet,
requires the survey year and wave in the workbook heading, and still checks the
family-medicine question, values and question bases. The official workbook now
ingests as two observations for 2026-O2; wave one remains available as
historical evidence, and the newer wave is an active monthly source.

For the question base in 5c, 71.97% reported waiting more than a day because no
earlier appointment was available (base N=2,020). Among respondents eligible
for question 5c_01, the reported mean was 9.71 days; 1,454 were eligible and
1,417 gave a valid number of days. These are provisional second-wave results,
not a full-year or centre-level estimate. The delay mean applies only to the
subgroup that waited more than a day for lack of an earlier appointment. The
Ministry describes the survey population and timing in its
[technical note](https://www.sanidad.gob.es/estadEstudios/estadisticas/BarometroSanitario/Barom_Sanit_2026/2Oleada/2026_2_OLA_NOTA_TECNICA.pdf)
and [survey specification](https://www.sanidad.gob.es/estadEstudios/estadisticas/BarometroSanitario/Barom_Sanit_2026/2Oleada/FT3574.pdf).

The text API and deterministic fallback use a reviewed snapshot when D1
successfully returns no matching rows; the Pages path also merges it with older
non-empty rows while the scheduled refresh catches up. A failed warehouse read
remains unavailable. Appointment-delay paraphrases share the same source and latest
wave. Region-specific, specialist and surgery claims do not inherit it. Claims
that assign a cause, claim an upward or downward trend, or say the delay drives
emergency visits receive the figure only as context and explicitly state what
comparison or causal data is missing. The survey does not decide whether a
wait is “too long” under a universal standard.

Regression checks cover the old and new workbook layouts, sample bases,
paraphrases, latest-wave selection, local and service neighbours, causal and
trend boundaries, the empty-D1 fallback, and the unavailable-D1 path. The
reviewed fallback expires on 28 February 2027 pending a refresh.

## Housing-supply text evidence — 23 November 2026

The deterministic audit of 300 unverified, web-observed claims surfaced a
recurring housing question that lacked a focused runtime answer: how new
housing completions compare with household growth, and whether that gap caused
rent increases. The text resolver now has a reusable construction-and-housing
family, based on the Banco de España's [Annual Report 2025](https://www.bde.es/f/webbe/SES/Secciones/Publicaciones/PublicacionesAnuales/InformesAnuales/25/InfAnual_2025.pdf).

For a direct national count, the report records 92,000 new homes completed in
2025, 9% fewer than in 2024. For shortage and causal claims, the answer keeps
that figure contextual and adds the report's estimate of 240,000 net new
households in 2025 and a cumulative 2021–2025 difference of 750,000 homes,
calculated by summing annual completions minus net household creation. The
report expresses that difference as 3.7% of the 2025 resident-household stock
and says 52.5% was concentrated in Madrid, Barcelona, Alicante, València,
Murcia and Málaga. It also discusses planning processes, construction capacity,
costs and specialised labour as several constraints; it does not quantify a
municipality's permitting delay or the separate contribution of each factor.

The answer does not treat the estimated national difference as a count of
homeless households or available, affordable rental homes. It does not use
these numbers to prove that construction or permits caused a rent increase.
City-specific claims, other periods and plain rent-price trends receive no
national construction figures. Tourist-housing displacement remains on its
separate evidence path.

Regression coverage checks direct-count paraphrases, causal paraphrases,
nearby rent-price and tourism claims, and mismatched city and period requests.
The deterministic audit moved from 3 complete, 22 limited and 275 uncovered
responses to 3 complete, 23 limited and 274 uncovered. These are routing
counts for an unverified discovery corpus, not an accuracy score or a result
for the optional live resolver.

## Compound text verdicts and source attribution — 23 November 2026

A compound answer could receive an overall “supported” label when one clause
had a cited observation and another clause was unsupported. Per-part
assessments were visible, but the headline and copyable answer could still
imply that the whole statement was established. The Pages response and local
preview now require every explicit part to have its own evidence ID and
attributable source before labelling the whole claim supported. Unlinked
positive verdicts become insufficient; an overall supported plan with an
unevidenced part is shown as limited, while already-limited plans receive the
same concise qualification. An insufficient plan with an unqualified positive
reply is also corrected; replies that already explain the evidence gap do not
get a repeated prefix. Unsupported whole-claim replies are not kept as
copyable sentences. Paraphrases of a causal employment claim, a
limited-evidence variant, and a nearby single-part employment claim exercise
the boundary in both paths.

## Modeled mortgage-capacity comparison — 23 November 2026

Reviewing the Banco de España's [Spring 2026 Financial Stability Report,
box 4.1](https://www.bde.es/f/webbe/Secciones/Publicaciones/InformesBoletinesRevistas/InformesEstabilidadFinancera/26/IEF_2026_1_Rec4_1.pdf)
exposed a scope omission in the public explanation: its wealth-based limit is
not only the cash down payment. The modeled household must have net wealth for
a 20% down payment, taxes and transaction costs, and one year of consumption,
assuming financing of up to 80% of the desired home price. The answer now says
that explicitly alongside the separate 35% debt-service-to-net-income limit.
It names the annual 2016–2023 sample of renters and first-home mortgage
buyers, notes that the restrictions can overlap, and preserves the study's
82%-of-population exclusion and the fact that modeled low capacity is not a
mortgage denial. Paraphrases share the reviewed source; reversed comparisons
are contradicted, and a 2026 claim does not inherit the dated values.

## Text answer evaluation scope — 23 November 2026

The live evaluation corpus measures whether text routes to the expected claim
family and whether unfamiliar text avoids an irrelevant verdict. Its previous
`knownAccuracy` field duplicated route recall and overstated what was checked;
new reports call the measure retrieval recall and state that they do not grade
factual answer accuracy. Traceability checks now understand both internal
answer plans and the public response shape, including per-part verdicts,
evidence-family data and cited source IDs. A secure URL alone no longer makes a
claim part traceable when its cited source ID does not match a listed source.

The answer-level benchmark now grades forty-three held-out text cases across
nine evidence families and one unmatched case against reviewed
snapshot-backed evidence. It checks the public answer's evidence
family, value, verdict, linked source, period, geography, population,
denominator, scope exclusions, traceability and word limit. It also checks
that paraphrases share evidence, while nearby claims with the wrong year or
territory do not inherit that evidence. Cases include housing completions,
tertiary-education employment, in-work poverty, primary-care waits, subjective
financial strain, the modeled mortgage-capacity comparison, GDP/population
growth and labour productivity. Direct
percentage and day thresholds are compared with a matching measurement unit;
the reply states how the observed value relates to the threshold. Metric
definitions distinguish a rate for waits over one day from a rate for longer
waits, and an average delay is not used to assess an unspecific wait-length
claim. The checks also preserve strict versus inclusive bounds and keep causal
claims from inheriting a descriptive rate verdict. It also checks regional
outpatient-wait comparisons against the Ministry's 2025 territory table,
including reversed and negated comparisons, source-update context and scope.
Unmeasured claims about a gap's size or intensity stay ungraded instead of
receiving a verdict from direction alone. The current run passes 43/43 across
nine paraphrase groups.

This small regression set is a useful guard against known answer failures,
not a population-wide estimate of factual accuracy. Broader validation still
needs a larger independently reviewed set spanning more claim families,
paraphrases, dates, places and unsupported claims; all answers also remain
bounded by the available reviewed sources and their definitions.

## Regional outpatient waiting-time comparisons — 23 November 2026

Named comparisons now use the Ministry of Health's corrected table for
31 December 2025. It reports the mean wait in days for patients on the
structural outpatient consultation lists, aggregated across ten specialties,
for Spain's autonomous communities and the cities of Ceuta and Melilla. The
Ministry identifies this as the latest available period in its
[waiting-list update](https://www.sanidad.gob.es/estadEstudios/estadisticas/inforRecopilaciones/listaEspera.htm);
its [corrected regional report](https://www.sanidad.gob.es/ca/estadEstudios/estadisticas/inforRecopilaciones/docs/LISTAS_PUBLICACION_Dic_2025_rectificado.pdf)
notes that regional administrations provide the underlying figures and are
responsible for their accuracy and counting criteria. The correction followed
revised data from Castilla-La Mancha.

The text resolver can compare any two named, source-covered territories when a
claim clearly says which had the longer or shorter wait. It reports both means,
the measurement date and the result of that comparison. Claims about another
year, a different service, an ambiguous territory, a specific specialty or a
cause remain outside this snapshot. The result does not establish an excessive
wait threshold or explain why regions differ. The benchmark checks positive,
reversed and negated phrasings, along with wrong-period, wrong-service and
unsupported-territory neighbours.

## Expired political scorecard fallback — 23 November 2026

The reviewed government-period scorecard expired on 31 October 2026. Both the
deterministic Pages fallback and local preview now withhold its figures and
return a concise evidence gap that names the expired comparison, asks for an
indicator and period, and explains that timing alone does not establish a
government's causal effect. Broad performance paraphrases share the same
scorecard interpretation; specific claims about an indicator remain on their
focused measurement path. The local preview can show this structured gap while
optional model enrichment continues, instead of leaving the user with only a
spinner.

Acceptance checks now test the same sourced scorecard family using a date when
the snapshot was valid, check that today's expired snapshot reveals no old
values, and guard nearby employment and public-finance claims against routing
to the broad scorecard. The acceptance suite is part of classifier validation.
The six source observations still need editorial refresh before this broad
scorecard can return numerical values again.

## Text-first economic claims — 23 November 2026

The reusable text-analysis family now distinguishes real GDP growth,
real GDP per capita, labour productivity per employed person, labour
productivity per hour, and national-accounts employment per capita. For
Spain from 2019 to 2025, the reviewed Eurostat series show real GDP up 10.0%,
real GDP per capita up 4.9%, productivity per employed person down 0.8%,
productivity per hour up 2.0%, and employment per capita rising from 43.5% to
46.0% (+2.5 percentage points). The 2025 observations are provisional. The
per-capita employment ratio uses total employment under the domestic concept
over total population under the national concept; it is not the labour-force
survey employment rate. [Eurostat productivity metadata](https://ec.europa.eu/eurostat/cache/metadata/en/nama_10_prod_esms.htm)
and the [annual national-accounts series](https://ec.europa.eu/eurostat/databrowser/view/nama_10_lp_ulc/default/table?lang=en)
define the measures and provide the underlying data.

The text path also handles compound claims about nominal pay and purchasing
power when both clauses describe the same wage/price comparison. In the
reviewed 2020–2025 Eurostat series, the gross hourly wage index rose 16.3%,
the harmonised consumer-price index rose 21.9%, and their ratio fell 4.6%;
from 2022 to 2025 the ratio rose about 3%. The wage index covers industry,
construction and services, not individual net or median pay, and the HICP is
not a household-specific cost-of-living measure. [Eurostat hourly wages](https://ec.europa.eu/eurostat/databrowser/view/lc_lci_r2_a/default/table?lang=en)
and [harmonised consumer prices](https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_ainr/default/table?lang=en)
are the source series. Answers identify this as a scoped index comparison,
not a statement that every worker gained or lost the same amount.

Answers compare the two productivity denominators and add GDP or employment
context only when the submitted text calls for it. They say when a comparison
does not measure a claimed cause; the indicators do not assign GDP growth to
employment or productivity. Tests cover paraphrases with matching sources,
claims that request population context, compound wage-price clauses, period
and territory mismatches, and nearby employment claims that must not
cross-route.

The same text path now compares Eurostat's annual all-items HICP with its food
and actual-rent sub-indices. From 2020 to 2025, the all-items index rose 21.9%,
food and non-alcoholic beverages rose 34.7%, and actual rental payments rose
8.9%. This shows why a national weighted average need not match a household's
own basket: food prices moved faster than the average in this interval, while
actual rents moved more slowly. The answer does not calculate personal
inflation; the HICP uses aggregate expenditure weights and excludes imputed
rent for owner-occupied housing. Its actual-rent sub-index does not measure
house purchases, mortgages or all housing costs. The comparison uses changes
within each annual index, so the indices' levels are not compared across
categories. Sources: [Eurostat annual HICP data](https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_ainr/default/table?lang=en),
[HICP coverage and classification](https://ec.europa.eu/eurostat/web/hicp/information-data),
and [Eurostat's explanation of expenditure weights](https://ec.europa.eu/eurostat/web/european-statistics-learning-hub/statistics-for-beginners/inflation).

The held-out text-answer benchmark passes 47/47 across eleven
paraphrase groups; this regression set is not a population-wide estimate of
factual accuracy. The 300-item unverified discovery set has 3 complete,
32 limited and 265 uncovered deterministic responses; those are routing and
retrieval outcomes, not a factual-accuracy score.

## Shopping-basket wording versus headline inflation — 23 November 2026

The same discovery audit found a common food-only formulation that the initial
food-and-rent comparison missed: that the shopping basket has risen more than
the general CPI suggests. The text route now accepts this wording and
paraphrases, retrieves the all-items and food HICP series, and adds the actual-
rent series only when the claim mentions housing or rent. A specific-product
claim, a mortgage claim or an unqualified shopping-basket statement without a
comparison does not inherit this family.

The local warehouse currently has the all-items series but can lack one or both
category series. If that live lookup cannot form a compatible comparison, the
resolver uses the complete reviewed HICP snapshot for all requested series;
it does not combine partial live observations with snapshot values. If the
snapshot is expired or does not cover the requested period, the answer remains
an explicit gap.

For Spain in 2020–2025, food and non-alcoholic beverage prices rose 34.7%,
compared with 21.9% for the all-items index: 12.8 percentage points more. The
reply labels this as limited evidence. It says that the category index measures
average prices, not what people bought or perceived, and that the comparison
does not establish that the general index misrepresents every household. It
does not calculate personal inflation without a household basket and its
spending weights. The underlying [Eurostat annual HICP series](https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_ainr/default/table?lang=en)
uses the same aligned annual observations as the broader comparison.

The held-out text-answer benchmark now passes 49/49 across 12 paraphrase groups,
including this food-only answer and its public qualification. The full
deterministic run of the 300 unverified discovery claims returns 3 complete,
33 limited and 264 uncovered responses; these measure routing and retrieval,
not factual accuracy. The claim corpus remains unverified.

The discovery audit now reports reusable focused-family routes separately from
generic compiler metric matches. In the same 300 claims, 82 match a compiler
metric, 109 match a focused claim family, and 43 match both; 148 match at least
one of those routes, while 152 match neither. A family route can still return
an explicit evidence gap, so these counts do not establish that the answer has
compatible data. The audit also reports 32 structured multi-part responses;
those are decomposition outcomes, not a claim-level accuracy score.

## Tourism employment claims — 24 November 2026

Text claims about tourism's role in employment now use the INE Cuenta Satélite
del Turismo. In its 2021–2024 series, employment in tourism-characteristic
branches represented 12.3% of total Spanish employment in 2024, about 2.78
million jobs; the INE marks 2024 as an advance estimate and 2023 as provisional.
The INE's source table reports jobs in thousands, and the release reports their
share of total employment.

This measures employment in tourism-characteristic branches. It does not
identify jobs caused by tourism demand, net job creation attributable to
tourism, job quality or seasonality, or whether the sector's share is "too
much." Those claims need an explicit assessment criterion and, for causation,
evidence that can compare outcomes with and without tourism demand. The
job-count feed is included in the INE refresh configuration; the reviewed share
snapshot expires on 21 December 2026 unless refreshed. The text route returns a
limited, sourced explanation and keeps unsupported regional, causal and
normative claims unverified.

## Education and pay claims — 24 November 2026

The text fallback now preserves Eurostat's reviewed 2022 gross hourly earnings
means by employees' attained education when a successful D1 lookup has no rows.
For Spain, the figures are €10.04 for ISCED 0–2, €11.48 for ISCED 3–4 and
€17.71 for ISCED 5–8. Coverage is employees of all sexes in enterprises with
at least 10 employees in NACE Rev. 2 B–S excluding O. Eurostat describes this
four-yearly survey and its measure in the [2022 survey metadata](https://ec.europa.eu/eurostat/cache/metadata/en/earn_ses2022_esms.htm); Spain's method is in its [quality report](https://ec.europa.eu/eurostat/cache/metadata/EN/earn_ses2022_esqrs_es.htm).

These observations group people by education attained, not by education
required for their jobs. They are context for claims that pay does not match
qualification; they cannot establish occupation-matched pay, individual or net
earnings, within-group distributions, or whether compensation is adequate. The
public verdict therefore remains insufficient. A successful empty lookup can
use the complete reviewed snapshot; failed lookups stay unavailable, and
partial warehouse results are not completed with snapshot values. Both tested
paraphrases retain the same three source rows.

At that review checkpoint, the deterministic audit of the 300-item discovery set reported 3
complete, 40 limited and 257 uncovered responses; 90 have a compiler metric
match, 114 a focused-family route and 50 both, leaving 146 with neither. The
items remain unverified inputs, and routing counts are not factual-accuracy
scores. The held-out text benchmark passes 49/49 cases across 12 paraphrase
groups; this regression set also does not estimate population-wide accuracy.

## Tourist housing as contextual evidence — 24 November 2026

When a successful warehouse lookup has no rows, the text fallback can now show
INE's May 2026 national estimate of 341,001 tourist dwellings and its 1.28%
share of total housing stock. The share uses the 2021 Population and Housing
Census as its denominator. The [INE count series](https://www.ine.es/consul/serie.do?d=true&nult=15&s=VTE71),
[share series](https://www.ine.es/consul/serie.do?L=0&d=true&s=VTE287) and
[methodology](https://www.ine.es/mapas/svg/indicadoresViviendaTuristica.htm?L=0)
describe an experimental estimate based on scraped, deduplicated listings
from three accommodation platforms and regional selection rules.

These figures do not measure homes withdrawn from long-term rental, available
rental supply, licensed dwellings, or the causal effect of tourism on rents.
They remain contextual evidence, so the two national claim paraphrases retain
an insufficient verdict. The national snapshot is withheld for claims about
neighborhoods, cities or specific tourist zones. Failed warehouse reads remain
unavailable, and partial observations are not filled with snapshot values.

The checkpoint after adding this context reported 3 complete, 42 limited and 255 uncovered
responses in the 300-item unverified discovery set. Of these claims, 90 have a
compiler metric match and 114 a focused-family route, with 50 in both; 146 have
neither route. The held-out text benchmark remains 49/49 across 12 paraphrase
groups. Neither set is a population-wide measure of factual accuracy.

## Electricity-network planning context — 24 November 2026

Two text claim families now use current, national MITECO context. For claims
about renewable generation and network constraints, the answer cites the
electricity plan approved on 20 November: it targets integration of 154 GW of
renewable capacity by 2030 and a significant reduction in curtailment. For
claims that grid investment lags demand, MITECO's July assessment says the
then-current annual investment limits had proved insufficient for transition
needs and new access requests; the November plan lists €17,142 million in
total planned investment and is designed for 47 GW of new demand.
See the [2030 plan](https://www.miteco.gob.es/es/prensa/ultimas-noticias/2026/noviembre/el-gobierno-aprueba-la-planificacion-electrica-en-el-horizonte-2.html)
and the [July investment-limit assessment](https://www.miteco.gob.es/es/prensa/ultimas-noticias/2026/julio/el-gobierno-acelera-la-electrificacion-de-la-economia-incrementa.html).

These are a plan, a policy assessment and future capacity; they do not measure
current MWh lost specifically to grid constraints or compare executed spending
with realized growth in renewables and demand. Both claim families therefore
retain an insufficient verdict. The national plan is withheld for claims about
regional bottlenecks. Their copyable answers now fit in two paragraphs, while
the evidence explorer retains the detailed scope and measurement gaps.

The current deterministic audit reports 3 complete, 49 limited and 248
uncovered responses in the 300-item unverified discovery set. Of these claims,
89 have a compiler metric match and 119 a focused-family route, with 50 in both;
142 have neither route. The public states are 275 insufficient and 25 limited.
All 300 remain unverified discovery inputs; these routing totals do not
estimate population-wide factual accuracy.

## Self-consumption connection claims — 24 November 2026

Text claims that autoconsumption connection procedures delay profitable solar
installations now receive a narrow, source-backed explanation. MITECO says
installations without surplus injection are exempt from grid-access and
connection permits. Surplus installations up to 15 kW are also exempt when
located on serviced urbanized land; other installations follow the applicable
procedure. See the [MITECO autoconsumption guidance](https://www.miteco.gob.es/es/energia/energia-electrica/electricidad/autoconsumo-electrico/preguntas-frecuentes-autoconsumo.html).

The guidance does not measure end-to-end processing time, applications,
activations, abandonment, or project profitability. It therefore cannot show
that delays blocked viable installations, and the answer retains an
insufficient verdict. National legal guidance is withheld for regional claims.
The public answer leads with the permit exemptions and the evidence gap in two
short paragraphs; it does not present transmission-generation queue capacity
as evidence about household self-consumption.

## Urban-planning permit delays — 24 November 2026

Text claims that slow urban-planning permits explain a low pace of construction
now receive context from the INE's [Building Construction Statistics inventory
entry](https://www.ine.es/dyngs/IOE/operacion.htm?numinv=20001). The operation
counts major-work permits granted by municipalities and describes the works;
the listed “planned duration” is the duration of the work, not permit
processing time.

The inventory does not provide the request-to-decision time or connect permit
delays to construction output. This context therefore leaves the causal claim
insufficient. Explicit residential supply claims keep their existing housing
evidence family, and regional permit-delay claims do not receive national
context as if it measured local waits.

## Low-income self-employment costs — 24 November 2026

Claims that mandatory costs make self-employment unviable now receive a
bounded 2026 contribution example from the [BOE contribution order](https://www.boe.es/buscar/act.php?id=BOE-A-2026-7296).
For net monthly returns up to €670, the reduced RETA table allows a contribution
base from €653.59 to €718.94. Choosing the minimum base and applying the listed
general rates gives an estimated €206.88 monthly contribution before any
applicable reductions or bonuses.

This is one statutory band and chosen base, not a business-survival study. It
does not compare a specific worker's irregular net income with the full set of
business costs or show that the contribution caused an activity to close, so
the claim remains insufficient. The copyable answer keeps that limit next to
the example rather than treating the monthly contribution as a universal fee.

## Unpaid overtime in hospitality — 24 November 2026

Text claims that unpaid overtime is common in Spanish hospitality now use the
INE EPA's current industry table, backed by the survey questionnaire. In the
third quarter of 2026, the EPA estimated 22,400 salaried hospitality workers
reported only unpaid overtime during their reference week and 5,300 reported
both paid and unpaid overtime. Together, 27,700 represented 30.8% of the
90,000 hospitality employees who reported any overtime, or 1.6% of the
sector's 1,732,500 salaried workers. The corresponding estimate was 26,800 in
Q1 and 39,200 in Q2; these quarterly estimates must not be summed as unique
people.
When a text claim names Q1, Q2, or Q3 of 2026, its answer selects that
quarter's counts, share and denominators instead of defaulting to the latest
quarter.

The questionnaire asks about paid and unpaid overtime hours in the employee's
main job during the reference week. The table estimates people, not total
unpaid hours, repeat hours for the same person, or a legal finding. The public
verdict is limited: the figures establish that employees reported unpaid
overtime, but the EPA does not define a threshold for “habitual” or show how
often the same worker experiences it. Regional, out-of-period and narrow
subsector claims do not receive the Spain-wide hospitality figures. The
held-out text answer benchmark passes 57/57 cases across 13 paraphrase groups;
that regression set is not a population-wide factual-accuracy estimate.
The deterministic audit of the 300-item discovery set now reports 3 complete,
50 limited and 247 uncovered answers; 274 public states are insufficient and
26 limited. There are 89 compiler metric matches and 119 focused-family routes,
with 50 claims in both groups and 142 with neither route. All inputs remain
explicitly unverified, and routing counts do not estimate factual accuracy.

## Pension contributor-to-pensioner ratio — 24 November 2026

Two recurring text claims now use the Ministry of Inclusion's [October 2026
Social Security affiliation presentation](https://bibliovirtual.inclusion.gob.es/documents/20121/0/202610%2BAfiliaci%C3%B3n%2Boct-26.pdf/427aa2e0-10cd-41c0-2815-84423e8f782c).
It reports 2.51 contributors per pensioner in October 2026 and 2.24 in 2014.
The [Social Security explanation of the pay-as-you-go system](https://www.seg-social.es/wps/portal/wss/internet/PortalEducativo/Profesores/Unidad5/PESS501/PESS503)
provides context on current contributions and benefits.

The reply is limited: the ratio is a headcount measure, provides no threshold
for “enough” contributors, and does not isolate the effect of ageing or
establish future sustainability. It is withheld for other territories,
unsupported dates, and old-age dependency claims. A separate routing fix stops
claims about the private sector financing several beneficiary groups from
inheriting a per-capita pension-spending figure or unemployment rate; the live
endpoint now returns an insufficient answer without a source or numeric claim
for that wording.

The held-out text answer benchmark passes 64/64 cases across 14 paraphrase
groups. Claim-focus validation covers 246 paraphrase and scope checks, and
semantic metric coverage checks 109 unseen formulations. The deterministic
audit reports 3 complete, 52 limited and 245 uncovered answers; public states
are 272 insufficient and 28 limited. There are 80 compiler metric matches and
118 focused-family routes, with 50 in both groups and 152 with neither route.
All 300 discovery inputs remain unverified, and these routing counts do not
estimate factual accuracy.

## Household saving and budget text claims — 24 November 2026

The text resolver now separates household saving claims from mortgage-entry
affordability. The [INE's 2025 household-sector accounts](https://www.ine.es/dyngs/Prensa/CTNFSI4T25.pdf)
put the aggregate saving rate at 12.0% of gross disposable income, 0.7
percentage points below 2024. The [Banco de España's 2025 annual report](https://www.bde.es/f/webbe/SES/Secciones/Publicaciones/PublicacionesAnuales/InformesAnuales/25/InfAnual_2025.pdf)
describes changes for groups by age, education, birthplace and housing tenure
over 2017–2024, but its cited table does not break saving out by household
income or number of earners. Those sources are context, so claims about
middle-income families or two-earner households remain insufficient.

For budget-share questions, the [INE's 2025 EPF](https://www.ine.es/dyngs/Prensa/EPF2025.htm)
reports housing, water, electricity, gas and other fuels at 33.2% of average
household spending and food at 16.0%; their combined share was 49.2%, compared
with 48.2% in 2024 ([2024 EPF](https://www.ine.es/dyngs/Prensa/EPF2024.htm)).
The 61.5% figure for the lowest expenditure-equivalent quintile is explicitly
kept distinct from a low-income quintile. EPF amounts are in current euros and
the housing category includes imputed rent for some owner-occupied or ceded
homes, so the change does not isolate price increases or bills paid.

The share trend is assessed against the two reported years. A mismatched
percentage can be contradicted only within that measure and period; claims
about other years or household groups remain insufficient. The observed
discovery claims web-243 to web-245 now retrieve these families with visible
sources, while their public verdicts remain insufficient where the claim
requires a group split or causal measure.

The held-out text benchmark passes 77/77 cases across 19 paraphrase groups,
including wrong-value neighbours, an unsupported year and an income-group
scope check. Claim-focus validation covers 271 paraphrase and scope checks.
These are regression results for reviewed snapshots, not a population-wide
accuracy estimate; the discovery claims remain unverified.

## Text reply accuracy and readability — 24 November 2026

The text-first pass tightened the copyable answers for collective-agreement
wages versus consumer prices, GDP growth versus household conditions,
full-time work and reported financial strain, generational housing claims,
tourist-housing supply and education-level pay. It keeps annual wage detail in
the evidence panel; distinguishes total output from household income and
separate ECV questions; and does not treat national housing estimates as proof
of local displacement, owner age or a causal effect. Education pay context is
labelled by attained education, not job requirements. Paraphrases share a
family only when their population and territory are compatible; nearby city
claims keep the national snapshot out.

For a broad Spain–Europe price-and-wage comparison, the fallback now supplies
Eurostat context but keeps the overall verdict insufficient. Spain's household
consumption price-level index was 99.7 in 2010 and 93.8 in 2022 (EU-27 = 100),
but Eurostat says changes in these indices over time are only indicative and
are not a reliable measure of price changes. Median gross hourly earnings in
Spain fell from 79.6% to 73.9% of the EU-27 median between 2010 and 2022. This
earnings sample covers both sexes at enterprises with at least ten employees,
excludes apprentices and agriculture, forestry, fishing and public
administration, and does not represent every worker. The EU average also does
not identify which richer countries the original claim means. Sources:
[Eurostat household price levels](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_ppp_ind_1?freq=A&indic_ppp=PLI_EU27_2020&ppp_cat18=E011&geo=ES&sinceTimePeriod=2010),
[Eurostat median earnings](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/earn_ses_pub2s?geo=ES&geo=EU27_2020&sizeclas=GE10&sex=T&unit=EUR&sinceTimePeriod=2010), and
[Eurostat guidance on comparing price levels over time](https://ec.europa.eu/eurostat/web/purchasing-power-parities/information-data).

A related claim that a formerly “good” salary no longer supports the same
standard of living now follows the real-wage interpretation. Because the salary
threshold and comparison years are vague, the fallback asks for those details
and for gross or net pay and a comparable population; it does not substitute
household median income or invent a trend.

The held-out benchmark now passes 113/113 cases across 35 paraphrase groups,
checking verdict, source links, evidence values, scope, concise answers and
public traceability. The full claim-focus suite covers 298 paraphrase and
boundary checks. These are reviewed regressions, not a guarantee about every
possible submission or a population-wide accuracy estimate.

On the 300-item web-observed discovery corpus, the deterministic fallback
returns 7 complete, 74 limited and 219 uncovered responses. A metric or family
route exists for 164 claims (71 metric matches and 140 family matches, with 47
overlapping); 136 have neither. Public results are 268 insufficient and 32
limited; 81 attach a consultable source, and none contains an untraceable
non-insufficient argument. No copyable answer in this run exceeds 160 words.
The inputs remain explicitly unverified, so these counts measure routing,
source attachment and reply length—not truth or factual accuracy. Unsupported
and city-specific claims continue to receive evidence gaps rather than adjacent
national figures.

The text pass adds a separate family for claims that recorded or contracted
hours fall short of hours actually worked. Three paraphrases for hospitality
share a route and the same evidence, while ordinary unpaid-overtime claims and
tourism employment-share claims stay in their own families. The EPA estimates
27,700 hospitality employees declared at least some unpaid overtime in the
reference week of 2026 Q3, 30.8% of hospitality employees who reported any
overtime that quarter. This is context only: the survey records reported paid
and unpaid overtime; it does not compare actual hours with timesheets or
contracts, or count omitted hours. The answers therefore remain insufficient.
A contract-hours claim without a named sector receives no hospitality data.
Sources: [INE EPA overtime table](https://www.ine.es/jaxiT3/Tabla.htm?L=0&t=79313) and
[EPA questionnaire](https://www.ine.es/inebaseDYN/epa30308/docs/epacues21.pdf).

A rural-versus-city claim about access to doctors now uses the existing rural
access family, but it receives no statistics because the project has no
comparable physician-access measure for both populations. Its evidence gap
asks for provider availability or access time by rural and urban population,
with a shared territorial definition and period. The requested fields adjust
to the service in the claim; a health-only claim no longer asks for housing,
employment, education or transport data.

Retirement-age claims now separate the statutory access age from observed
retirement ages and projections. The [Social Security rules](https://prestaciones.seg-social.es/servicio/pension-jubilacion.html?categoria=jubilacion)
say that in 2026 the ordinary age is 66 years and 10 months with fewer than
38 years and 3 months of contributions, or 65 with that contribution period;
from 2027 the thresholds become 67 with fewer than 38 years and 6 months, or
65 with at least that period ([Social Security Act](https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724&p=20250430&tn=0)).
The [Social Security's 2026 report](https://revista.seg-social.es/-/la-pension-media-del-sistema-de-la-seguridad-social-alcanza-los-1.376-1-euros-en-octubre-un-4-6-mas-alta-que-hace-un-ano?redirect=/)
reports a 65.4-year mean age of access for new retirement pensions through
September 2026, versus 64.4 in 2019. AIReF's [2025 pension-model methodology](https://www.airef.es/wp-content/uploads/2025/04/Documentos-tecnicos-segunda-opinion-sostenibilidad-a-largo-plazo-AAPP/250225_DT_metodologia_pensiones.pdf)
projects an aggregate effective retirement-age average of 65.2 in 2024, 66.0
in 2030 and 66.2 in 2035. Those observed and projected averages do not identify
the retirement age of today's young cohorts or the share who would work until
near 70. Future-cohort answers show these figures as context, keep the verdict
insufficient, and ask for cohort-specific projections and age distributions.
Observed-average claims and migration-causality claims stay on separate routes.

## Private retirement-saving claims — 24 November 2026

The existing family for “paying twice” now also recognizes equivalent wording
that says private saving is essential, asks whether a private plan is legally
mandatory, or says the public pension may not maintain a person's living
standard. Related clauses about private saving and public contributions can
stay in one answer; unrelated propositions remain separate. The two
sufficiency paraphrases share legal and AIReF context; two legal-question
paraphrases share only the two law sources. A France-scoped claim receives no
Spanish law or AIReF evidence. Current pay-as-you-go financing claims stay on
their own route.

The answer separates the statutory obligation to contribute to Social
Security from private pension plans. It includes the legal exception for a
collective agreement that automatically enrolls workers in an employment plan,
with a written opt-out within the agreed period. For context, AIReF's model
projects an aggregate replacement rate of 72.4% in 2027 and around 70% from
2050. The denominator is the initial pension divided by salary at retirement;
the model uses 2023 administrative microdata and is not a net pension estimate
or a household-budget measure. These sources do not show that every person
needs private saving or how much; those answers keep that verdict insufficient.
The legal questions receive a limited verdict because the law includes the
collective-agreement enrolment rule and opt-out.
Sources: [Social Security Act, Article 18](https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724&p=20250430&tn=0),
[Pension Plans Act, Articles 1 and 4](https://www.boe.es/buscar/act.php?id=BOE-A-2002-24252&p=20221224&tn=1), and
[AIReF's 2025 pension microsimulation](https://www.airef.es/wp-content/uploads/2025/04/Documentos-tecnicos-segunda-opinion-sostenibilidad-a-largo-plazo-AAPP/250212_DT_microsimulacion_pensiones.pdf).

The held-out text-answer benchmark now passes 118/118 cases across 37
paraphrase groups; claim-focus validation covers 301 paraphrase and boundary
checks. The 300 unverified web-observed claims now have a metric or family route
for 165 (71 metric matches, 141 family matches, 47 overlapping), leaving 135
with neither. The deterministic fallback returns 7 complete, 76 limited and
217 uncovered responses; the public states remain 268 insufficient and 32
limited. These figures measure reviewed routing, sourcing and answer scope,
not truth or accuracy across all possible text submissions.

## Text-first answer quality pass — 24 November 2026

The current pass prioritizes typed claims and short, source-linked explanations;
it does not change the submission formats. Two reusable evidence families were
added: INE TIC-H 2026 measures unmet online public-service needs and reported
problems among users, while BOE Article 28 of Law 39/2015 explains the right to
reuse documents already held by an administration. The survey is not used to
claim general digital exclusion, and the law is not used to infer how often an
office complies. Its exceptions—including sanction and inspection proceedings
and the case where a document cannot exceptionally be retrieved—stay in the
answer.

The held-out benchmark now passes 194/194 cases across 54
paraphrase groups. Claim-focus validation covers 320 paraphrases and boundary
checks. The full classifier suite and `npm run check` pass; Astro reports no
errors or warnings and five existing hints. A cross-family regression found
that “cuarto trimestre” could be read as “room”; room matching now requires
rental or shared-housing context, and a job-vacancy-rate runtime case protects
that boundary.

The legal-answer composer now distinguishes a claim that the law denies the
right to reuse documents from one that says resubmission is mandatory, and
from the correctly negated claim that resubmission is normally unnecessary.
New wording cases protect those opposite verdicts and keep ambiguous legal
claims mixed until the applicable rule is clear.

Rent-cap claims about homes leaving the regulated market use the existing
rental-regulation family. Its evidence request now distinguishes the affected
area from a comparable area and the period before and after the measure;
tourism-specific requirements appear only when the claim mentions tourism.
Generic housing-supply gaps no longer use tourism-specific wording. Tests keep
these claims separate from tourist-housing and rent-price claims.

Claims that primary-care appointment delays push people into emergency care
now remain insufficient: the Ministry of Health's 2026 second-wave survey
measures waiting time, not linked emergency visits or a causal effect. It
reports that 72.0% of the question 5c base (n=2,020) waited more than a day
because no earlier appointment was available; among respondents eligible for
question 5c_01, 1,417 valid answers give a mean wait of 9.71 days. The survey
covers adults who used public family medicine for their own health problem in
the previous 12 months and excludes mutualities with private care. Surgery
wait claims stay outside this primary-care route. Source: [Ministry of Health,
2026 Barómetro Sanitario, second wave](https://www.sanidad.gob.es/estadEstudios/estadisticas/BarometroSanitario/Barom_Sanit_2026/2Oleada/2026_CIS_2_OLA_3574multi.xlsx).

The 300-item unverified discovery corpus currently has a metric or focused
family route for 169 claims (66 metric matches and 150 family matches, with 47
overlapping); 131 have neither. The deterministic fallback returns 7 complete,
87 limited and 206 uncovered responses. Public states are 265 insufficient
and 35 limited. These are operational routing and sourcing counts, not factual
accuracy scores; the corpus remains unverified. Text answer accuracy still
needs broader review and coverage work before expanding the modality scope.

A concurrent exploratory pass over 22 claims without deterministic routes found
that some non-geographic comparisons could receive a gap message about missing
data for two territories. The message now requires two explicitly named,
recognized territories; checks cover country pairs, Spanish-region pairs and
nearby employment, public/private-service and household comparisons. This fixes
the scope of that limitation message, not the underlying answers. The same
exploration still found tangential retrieved context on some unresolved claims,
and high resolver latency under concurrent load; relevance and load behavior
remain open text-first work. This exploratory sample is not an accuracy
benchmark.

Source: [BOE, consolidated Law 39/2015](https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565&p=20261001&tn=1).

## Direct text measures and subgroup scope — 24 November 2026

A fresh resolver replay found that pension-reform causality wording could
receive unrelated IMV and unemployment-benefit context, and a direct count of
foreign unemployment-benefit recipients could be replaced by a migration,
benefits and employment overview. That answer also mixed the foreign-recipient
count with the all-recipient total. Text retrieval now applies the original
claim's metric and population scope, blocks a broad packet that omits a
requested measure, filters total rows from a single-group count, and preserves
multiple groups when the wording asks for a comparison. Count wording in a
noun phrase routes through the quantity handler; a share remains a separate
metric.

Live checks kept two pension-causality paraphrases free of unrelated IMV and
unemployment figures. A household electricity claim retained the household
price-per-kWh series, with the wholesale-price clause left unconfirmed. Two
count phrasings resolved to the same SEPE series: 231,920 foreign recipients
in November 2025 and 239,124 in December 2025. The separate share series was
13.0% and 13.39% of all unemployment-benefit recipients in those months. A
nearby question about Spanish recipients did not receive the foreign count or
generic Moncloa documents; it remains an explicit evidence gap. Discovered
sources are checked against the original claim terms and subgroup dimensions,
so words introduced only by an expanded search query cannot qualify a source.
The SEPE snapshots in the local warehouse were retrieved in August 2026 and
end in December 2025, so these answers remain limited and explicitly need an
update; they are not current November 2026 totals. The sources measure the
SEPE monthly definition, not every public benefit or the probability of
receiving a benefit within either population.

Warehouse-query, semantic-metric-coverage and claim-focus validators pass,
including count/share, foreign/Spanish subgroup and rental/employment boundary
cases. `npm run classifier:validate` passes, including the 194-case held-out
answer benchmark and live statistical-answer integration. These checks cover
reviewed formulations and regression boundaries; they do not establish
accuracy for every text a user may submit. Multimodal evidence quality remains
outside this text-first pass.

## Collective-wage purchasing-power wording — 25 November 2026

The collective-agreement wage family now recognizes claims that say agreed
salaries have not regained purchasing power, including equivalent wording
about buying power. Negated recovery is interpreted as lagging wage growth;
positive recovery remains a separate direction. These phrasings use the same
official settlement-rate and HICP evidence. The answer compares the 15.7%
cumulative rise in negotiated settlements from 2021–2025 with 21.9% HICP growth
from 2020–2025 and labels the 2025 settlement figure provisional. It does not
extend the national result to women, particular cities or sectors, and causal
claims about inflation stay in their own evidence family. A claim about the
number of agreements does not inherit wage-settlement data.

The held-out text-answer benchmark passes 199/199 cases across 54 paraphrase
groups. `npm run classifier:validate`, the 291-claim/20,105-formulation routing
corpus, and the family-collision guard pass. These are regression checks, not
a population-wide estimate of factual accuracy. Tangential context on other
unresolved claims and high resolver latency under concurrent load remain open
text-first work.

## Reviewed text answer latency — 25 November 2026

The mortgage entry-versus-payment family already carries a reviewed source and
defines its comparison, population, period and scope. The live resolver was
still spending time on local-model compilation and research planning for this
single-proposition family. Its deterministic path now skips those model calls
when the reviewed family and direct evidence are present. Compound claims and
nearby claims without the comparison remain on the general path.

On a fresh local process, the entry-more paraphrase returned in 5.2 seconds and
the reversed comparison in 4.6 seconds. Both used the same Banco de España
source and 2016–2023 sample; the first was supported and the reverse was
contradicted. Resolver telemetry showed two focused compiler skips and no
research-planner delay for these claims. An adjacent statement that merely
names the entry and monthly payment stayed outside the family and remained
insufficient. These are three local requests, not a controlled load benchmark;
the unresolved neighbour still took 13.7 seconds. A separate concurrent replay
of the two comparison phrasings took 9.5 seconds each, with zero compiler misses
and two focused skips. End-to-end p95 was 9.3 seconds; classification p95 was
5.0 seconds and retrieval/answer p95 was 4.8 seconds. The research-planner stage
was absent, so other processing remains the main latency source for this family.
These small samples do not establish performance under sustained load.

The mortgage paraphrase and reversed-direction validator passes, along with
339 claim-focus boundary checks. This confirms the reviewed route and its
scope regressions, not accuracy for arbitrary user submissions. No image, PDF
or audio work was included in this text-only pass.

## Causal evidence fit — 25 November 2026

The generic causal evidence ladder no longer treats two different measures in
the same period as a like-for-like comparison. Time trends must share a metric
and scope; geographic or group comparisons must also align on metric, unit,
population, denominator and period. A title containing words such as
“research” or “impact” is not enough to classify a statistical series as a
causal study. Causal summaries now use observations selected for the claim,
plus records explicitly typed as causal studies, so unrelated retrieved rows
cannot enter the causal context by default.

The causal-evidence validator checks a wage-pressure paraphrase group against
its nearby unemployment-rate question, and covers mixed metrics, a research-
and-development time series, and a causal-study estimate beside an unrelated
trend. These are regression boundaries for evidence selection; they do not
establish accuracy for arbitrary claims or measure live resolver latency.

## Text measurement scope and source flags — 25 November 2026

The Spanish job-vacancy family now reads Eurostat's [NACE Rev. 2.1 API series](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/jvs_q_r21?geo=ES&sinceTimePeriod=2015&nace_r2_1=B-T&sizeclas=TOTAL&s_adj=NSA)
with the activity aggregate, size class and adjustment method fixed in the
source query and metric definitions. Vacant posts, occupied posts, the vacancy
rate and its quarter-on-quarter change each map to their own indicator code.
The evidence selector checks those dimension codes before use, so the retired
NACE Rev. 2 series or a different activity aggregate cannot stand in for the
current measure. The two classifications must not be joined without a linking
table.

Eurostat's API returned Q3 2026 observations with its provisional flag. The
[Q2 release page](https://ec.europa.eu/eurostat/web/products-euro-indicators/w/3-15092026-bp)
listed 16 December 2026 as the next release date, so the regular Q3 release
was scheduled after this review. The answer composer now carries source
quality notes into the main reply as well as the evidence details. This is
shared text-response behavior, not a
special phrase for vacancy claims. The series counts posts, not unique people;
the [Eurostat definition](https://ec.europa.eu/eurostat/cache/metadata/EN/jvs_esms.htm)
divides vacant posts by occupied plus vacant posts. The source uses unadjusted
quarterly data for the specified activity scope. It cannot establish why a
vacancy remains open or describe every worker's job search.

The local coverage audit now marks all four vacancy metrics ready under one
Eurostat feed, and all 24 configured refreshes in that audit succeeded. The
runtime regression checks rate, count, occupied-post and quarterly-change
paraphrases, rejects cross-measure substitutions and legacy-series leakage,
and requires provisional wording in the public answer. The held-out text
benchmark remains 199/199 across 54 paraphrase groups; claim-focus boundary
validation remains 339. These are reviewed regression sets, not an estimate
of accuracy for arbitrary submissions. The local warehouse refresh is not a
verification that production D1 has been mirrored; the deployment's scheduled
refresh must populate that store before production can use these rows.

## Text source-composition coverage — 25 November 2026

The local coverage report had treated the subjective-poverty total as
unconfigured even though runtime answers compose it from Eurostat's mutually
exclusive “difficulty” and “great difficulty” rows. It also missed both INE
tourist-housing metrics because the domain feeds had no explicit metric mapping.
The metric registry now declares the poverty sum, its input metric IDs, source
dimension values, required dimensions and refresh-time tolerance. Runtime
aggregation and the local coverage audit use that same composition contract;
the audit requires every component to be configured, materialized, valid and
fresh. The two INE feeds now name their individual metrics.

After regeneration, the local audit recognizes 228 of 229 metrics as
configured: 220 ready, five stale, three with partial domain evidence, and one
metric without a warehouse feed configuration (tourism-characteristic
employment share). That metric still has a reviewed 2021–2024 snapshot, which
expires on 21 December 2026; it lacks automatic feed refresh. The audit marks
both tourist-housing series ready and treats subjective poverty as derived
from its two source rows. All 24 domain feeds in the local refresh report
succeeded. These are local source-readiness counts; they do not confirm that
production D1 was synchronized or estimate accuracy for arbitrary text.

The tourism-employment share remains snapshot-backed because INE publishes it
in the annual Satellite Account release, while the configured `DATOS_TABLA/72970`
series supplies job counts. The latest release available for this review lists
2021–2024 shares, with 2023 provisional and 2024 an advance estimate. Refreshing
that archived page repeatedly would update its retrieval date without adding a
new observation period, and the job-count series is not a substitute for the
percentage. Keep the snapshot's period and status visible until the next INE
release is reviewed.

The composition fixture also removes one required poverty component and checks
that the aggregate becomes a source gap. The subjective-poverty paraphrase and
nearby-claim checks pass; the held-out text-answer benchmark remains 199/199
across 54 paraphrase groups, and `npm run check` reports zero errors. These
checks cover reviewed claims and source boundaries, not the full range of user
wording.

## Production text-evidence freshness audit — 25 November 2026

A read-only query of production D1 found 195 source documents and 635,418
observations across 188 metrics; the newest source snapshot was retrieved on
15 November. The production migration ledger ends at `0010`, while the current
warehouse loader depends on migration `0011_warehouse_source_imports`. The
24 November refresh run also showed empty Cloudflare credentials, so migration
and warehouse-import steps were skipped. Its local export stopped earlier
because four domain feeds had failed; one timed out, one returned 403 and two
returned 404. The freshness gate had treated any failed feed as a reason to
reject all otherwise valid snapshots.

The scheduled workflow now validates each successful feed and may continue to
export/import those snapshots when other feeds fail. The failed-feed report
still causes the run to finish as failed. D1 freshness classification also now
uses the same schedule rules as the local audit; yearly sources and BOE legal
discovery no longer inherit the daily or hourly limits by accident. Production
still needs the repository's Cloudflare account ID and scoped D1 token before
the scheduled workflow can bring its evidence store up to date. Observation
period and population remain separate from snapshot retrieval time in answers.

## Text source follows retained evidence — 25 November 2026

The resolver previously chose a source before applying its final population
filter. An observation could then be removed while its source remained attached
to the response. Source selection now follows the observations that survive
that filter; a source with no retained evidence is omitted. The separately
validated indexed-source path remains available as contextual material when no
warehouse observation was returned.

The warehouse-query regression checks two paraphrases against the same
foreign-beneficiary evidence, the adjacent Spanish-beneficiary wording against
its own evidence, and an empty population match without a source. This protects
source attribution at the filter boundary; it does not resolve the production
D1 refresh gap or establish accuracy for arbitrary claims.

## Scheduled text-data refresh gate — 25 November 2026

The 25 November scheduled refresh failed before source ingestion because
`refresh-utils.mjs` imported `isBoeLegalDiscoveryUrl` from the freshness policy,
but that helper was not exported. The freshness policy now exports the shared
URL classifier. The refresh-configuration and resilience validators, plus the
source-freshness validator, pass locally. The same workflow run also reported
that production D1 sync credentials are absent, so this fix enables the next
refresh attempt but does not update the production evidence mirror.

## Direct metric retrieval for text paraphrases — 25 November 2026

The clean CI runtime exposed a gap in the text path: an accurately phrased
request about rents paid by households was recognized as the rental index by
the local resolver, but the Pages API only fetched metric-specific D1 rows for
preconfigured claim families. Its generic full-text lookup did not match the
fixture's warehouse search text, so the resolver received no usable evidence.

Metric alias matching now uses the generated measurement vocabulary in both
the API and local resolver. The API hydrates D1 by the matched metric when a
claim has no preconfigured family route; the resolver still filters the rows
against the claim's population, period, unit and metric scope. Advertised or
asking-rent wording remains excluded from the actual-rent index. A second
paraphrase also exposed an intent collision: “rents households pay” matched a
rent-affordability rule because “pay” was treated as an income cue. Dated rent
trend intent now takes precedence there; rent-to-income questions keep their
affordability route. The runtime regression compares two paraphrases for the
same rental-index evidence, source and latest period, and checks advertised-
rent neighbors separately.

This improves retrieval recall for direct metric paraphrases; it does not
measure accuracy for arbitrary wording or refresh production D1. Production
still needs valid Cloudflare sync credentials before the scheduled mirror can
ingest newer observations.

## Second homes and tourist-housing scope — 25 November 2026

The 300-candidate text audit surfaced a negative-neighbour error: a claim that
second homes affect local housing while explicitly saying they are not tourist
flats received the INE tourist-dwelling count as context. A sourced contextual
number can still mislead when its category is explicitly excluded by the claim.

Second-home pressure claims now use their own evidence-gap family. The answer
keeps the INE tourist-housing methodology only to explain that the available
series counts platform-listed tourist dwellings; it does not use the count or
share as evidence about all second homes, local rental supply or causal effects.
Metric alias retrieval also ignores a category mention negated by a copula,
while ordinary tourist-housing counts and supply claims retain their existing
routes. Two second-home paraphrases, the excluded tourist series, the public
insufficient verdict and positive tourist-housing neighbours are covered by
the claim-focus validator. This closes one discovered routing boundary; the
exploratory corpus is not a measure of factual accuracy across all text.

## Text causal-gap routing and replies — 25 November 2026

The 300-candidate text audit is an operational routing/retrieval report, not an
accuracy benchmark: it reported seven complete, 94 limited and 199 uncovered
results. A live replay of the claim that Spanish-trained professionals work
abroad because salaries are not competitive exposed a semantic ordering bug:
“terminan trabajando” made the claim a trend before “por falta de” was read as
a causal attribution. Search also found unrelated official snippets containing
the word “profesionales”; they had no claim-linked observation, so the public
adapter withheld them and returned an insufficient result.

The deterministic compiler and query signature now recognize reusable Spanish
reason-for-absence connectors, including “por falta de” and “debido a la falta
de”, as causal. A causal gap asks for a source measuring the proposed factor
and outcome over the same population, territory and period, plus an analysis
that considers other explanations. Public evidence-gap replies show each
requirement as a separate bullet paragraph. Paraphrases use the causal evidence
contract; a migration trend without an asserted reason and a standalone wage
comparison remain outside that causal route. The live replay stays
insufficient, shows no unsupported number or unattributed public source, and
keeps the two causal evidence needs. These checks fix one discovered semantic
boundary; the 300-candidate audit and this replay do not estimate accuracy for
arbitrary user wording.

## Industrial electricity and competitiveness replies — 25 November 2026

A live text audit found that the industrial-electricity competitiveness family
correctly treated Eurostat's non-household price as context and returned an
insufficient result, but repeated caveats in a long answer. Its shared
composer now gives the observed measure once, with Spain, semester, unit,
consumption band and tax treatment; it then states that a consumption-band
average cannot establish sector-specific costs or a competitiveness effect.
The final sentence identifies the missing comparable company prices, cost
shares and business outcomes. If the observation does not carry the expected
band and tax dimensions, its number is omitted rather than presented with an
assumed scope.

The focus validator checks three causal phrasings receive the same evidence and
answer, while household electricity and direct large-consumer price questions
keep their own routes. The current contextual observation is Eurostat's
2026-S1 rate for Spanish non-household consumers using 2,000 to less than
20,000 MWh per year, excluding VAT and other recoverable taxes and levies. It
does not measure all industrial firms or prove a causal loss of
competitiveness. These regression checks address the discovered family only;
they do not score text accuracy across the full claim corpus.

## Health-access text audit — 25 November 2026

A four-claim live sample kept causal claims about primary-care delays and
regional physician shortages insufficient. The public-access answer for rural
healthcare was also insufficient, but repeated the same comparison gap in
three paragraphs. Its family composer now states the missing rural/urban
measure once and keeps the service, population, territory and period
requirements together.

The same sample found unrelated official search results for a claim that
public mental-health services have too few clinical psychologists for demand.
The public adapter withheld those unverified documents and kept the result
insufficient. A reusable capacity-versus-demand family now asks for public
clinical-psychologist staffing, the population served, demand and waiting-time
measures, territory and period, and an explicit adequacy criterion. Direct
staffing-count questions use a separate evidence-gap family so broad health or
employment snapshots cannot stand in for a psychologist count; causal claims
about waiting lists also stay outside the adequacy comparison. Tests cover
three paraphrases and those nearby claims.
The follow-up replay completed both claims: each remained publicly
insufficient with zero public sources, and the new psychologist-capacity route
did not expose the unrelated search results. The refreshed 300-candidate
operational audit now reports 177 candidates with a metric or focused-family
route and 123 without one; these are routing counts over unverified claims,
not an accuracy score.

## Tax and service-perception comparisons — 25 November 2026

A text audit found two substring collisions in deterministic claim typing.
“Contribuyente” contains “contribuye,” so a parallel statement about tax
payments and perceived public-service quality was labeled causal. “Impuestos”
contains “puesto,” so even a plain statement that a taxpayer pays taxes could
be misrouted as a ranking comparison. The compiler now checks causal and
comparison signals as words or phrases, recognizes “más impuestos” and
“peores servicios que hace unos años” as comparisons, and keeps an explicit
tax-to-service causal statement on the causal evidence path.

The public reply for the parallel-trend claim now requests comparable measures,
periods and denominators without asking for a causal study. It remains
insufficient: the available evidence does not yet pair a defined tax-burden
measure with service-perception results for the same population and period.
Regression coverage checks two paraphrases plus an explicit causal neighbour;
the held-out text-answer benchmark passes 202/202 cases across 55 paraphrase
groups. This is a routing and reply regression check, not evidence that the
underlying public claim is true or false, nor an accuracy estimate for all
text users may submit.

## Healthcare perception and outcomes — 25 November 2026

A text audit found that a compound claim about falling perceived quality and
strong national health outcomes had no sourced answer, even though the project
already contained official survey and OECD material. A reviewed family now
keeps the Barómetro Sanitario satisfaction series separate from population
health outcomes. It reports the 2019–2025 decline, the missing 2020–2021 survey
years, and the increase from 6.02 in the 2025 second wave to 6.19 in the 2026
second wave. It also reports selected OECD comparisons while noting that the
indicators' reference years vary and that they do not establish causality or
summarize all of healthcare quality.

Three paraphrases share the same primary sources and mixed verdict. Nearby
claims about primary-care satisfaction, waiting lists, opinion alone and health
outcomes alone do not cross-route into this compound family. The held-out
text-answer benchmark passes 205/205 cases across 56 paraphrase groups; the
claim-focus validator passes 351 paraphrases and its negative-neighbour checks.
These are evidence and reply regression checks, not an estimate of accuracy
across arbitrary user text.

## Regulatory burden reported by small firms — 26 November 2026

Three recurring claims concerned gestoría costs, administrative complexity as
an “extra tax”, and whether smaller shops carry more regulatory burden than
large platforms. The [EIB Investment Survey 2025: Spain overview](https://www.eib.org/files/publications/20250218-091225-econ-eibis-2025-spain-en.pdf)
provides bounded context. It reports that 84% of its Spanish SME respondents
called business regulation an obstacle to investment (55% a major obstacle,
29% a minor one). In a separate question, among 421 SME respondents, 32% said
more than 10% of their staff assessed or complied with regulatory requirements
and standards and completed related reporting; 57% reported up to 10% and 11%
reported none. For 115 large-firm respondents, those shares were 3%, 93% and
4%. The survey includes mandatory and voluntary requirements.

These are company survey responses, not observed gestoría invoices or a
calculation of compliance cost in euros. The report defines its SME group as
firms with 5–249 employees, interviews 601 Spanish firms overall, and weights
published figures by value added. It does not represent self-employed people
without employees or compare local shops directly with online platforms. The
answer therefore presents the figures as context and leaves the claims about
mandatory advisor costs, an additional tax, and platform-versus-shop costs
unconfirmed. Direct questions about the two survey measures receive the
matching figure and population. A release-boundary audit caught that the first
snapshot date was one calendar day ahead of the live Cloudflare runtime's UTC
date, which suppressed the source until the next day. The reviewed and retrieval
dates now use the UTC date, and the deterministic public fallback is checked at
that boundary.

The reusable family keeps those two measures distinct and rejects nearby
questions about appointments, licenses, public aid and tax-system changes.
It also preserves the separate RETA route for claims about small or irregular
side-income being outweighed by self-employment costs. Held-out answer checks
pass 254/254 cases across 67 paraphrase groups; claim-focus validation checks
380 formulations and negative neighbours. The refreshed 300-claim audit
routes 187 candidates to a metric or focused family and leaves 113 without a
deterministic route. With the snapshot usable at the actual UTC release
boundary, the deterministic fallback returns 7 complete, 107 limited and 186
uncovered answers; public states are 263 insufficient and 37 limited. The
largest uncovered topic groups are employment and wages (26), immigration and
security (24), tax and public administration (23), health (21), and education
(21). These are unverified discovery claims, so the counts prioritize evidence
work; they do not measure factual accuracy. The next data work should target
those recurring gaps with reviewed sources instead of treating more routes as
more coverage.

## Pension and early-career wage comparison — 25 November 2026

A recurring text claim says that some public retirement pensions exceed the
pay of many young workers. The 2025 AEAT tables support that existential
comparison in a narrow scope: the public retirement-pension mean was €21,964
for 5,983,366 pensioners in the common fiscal territory, while 1,030,308 of
3,094,196 salaried people aged 26–35 in AEAT's annual-estimated-salary module
were in the three lowest overall salary deciles, whose upper boundary was
€21,778. This establishes a useful lower bound on the young-worker side and,
because the pension mean exceeds that boundary, implies at least one public
retirement pension above it.

The answer states that the 33.3% is a lower bound for workers below the
pension mean, not the exact share; it does not infer how many pensioners exceed
those wages or link particular pensioners to workers. It identifies the
2025/common-fiscal-territory scope, explains that the AEAT salary estimate
annualizes workdays to 360 and excludes estimates below the SMI, and avoids
mean-to-mean, monthly, minimum-wage and other-year claims. The text benchmark
now passes 215/215 cases across 57 paraphrase groups; family validation passes
351 paraphrases and checks the positive paraphrases, an existential negation,
and nearby scope boundaries. The latest deterministic 300-candidate audit
routes 178 candidates to a metric or family and leaves 122 without either;
these remain unverified discovery inputs, not an accuracy score. These checks
are not an accuracy estimate for arbitrary user text.

## Business size and productivity — 25 November 2026

The 300-claim review set includes a recurring claim that small firms' size
limits investment, technology adoption, productivity and pay. Eurostat's
latest available Spanish structural-business table provides a useful
cross-sectional productivity comparison for 2024: apparent value added per
person employed ranges from €42,830 in enterprises with 0–9 persons employed
to €71,950 in enterprises with 250 or more, with higher values in each
intermediate size class. The large-class value is about 68% above the
smallest-class value.

The route reports that association as context only. It leaves the causal
claim unresolved because the aggregate comparison does not show what would
happen if a company grew, and the table does not measure investment,
technology adoption or salaries across those same classes. The answer defines
the indicator as value added per person employed, distinguishes it from pay
and productivity per hour, and gives the Spanish business-economy coverage.
The same productivity snapshot now gives context to a separate family of
large-firm pay-restraint claims, but does not count as evidence about wages or
firms' pay decisions. Regression cases verify four causal paraphrases, three
pay-restraint paraphrases, consistent sources, a compound "because"
formulation, and boundaries for other years, regions, sectors, European pay
comparisons and claims about firm wages without a size comparison. The
held-out text-answer benchmark now passes 227/227 cases across 59 paraphrase
groups; the focused evidence validator and broader classifier suite also
pass. At this update, the deterministic audit of 300 explicitly unverified
discovery candidates reported 7 complete, 98 limited and 195 uncovered
outputs; the public states were 263 insufficient and 37 limited. This is a
routing and coverage snapshot, not an accuracy estimate. Both causal answers
remain publicly insufficient despite their useful sourced context, which is
the intended evidence boundary.

## Railway investment and maintenance — 25 November 2026

Two recurring text claims compare high-speed rail investment with neglect of
conventional lines or political attention to maintenance. ADIF's [2023 execution
report](https://www.adif.es/w/adif-bate-r%C3%A9cord-hist%C3%B3rico-de-inversiones-en-la-red-convencional-en-2023-1.430-millones-de-euros-1-7-veces-lo-ejecutado-en-2022)
records €1,429.8 million of executed investment in the conventional network and
€1,974.5 million in new lines and the operating high-speed network. It reports
€974.3 million of operating expenditure for conservation and maintenance:
€600.6 million on the conventional network and €373.7 million on high-speed
lines. The published amounts exclude VAT.

The answer labels these as context. Capital investment and operating
maintenance expenditure are different budget categories; absolute totals do
not show network condition, traffic, kilometres, maintenance need or political
attention. Both claims therefore remain insufficient, even though users get
the dated figures and a clear description of what they cannot establish. Two
paraphrases share one source; tests reject other years, Madrid-specific and
service-specific readings, and claims about punctuality. The held-out
text-answer benchmark now passes 233/233 cases across 60 paraphrase groups.

The refreshed deterministic audit routes 180 of the 300 explicitly unverified
discovery claims to a metric or focused family and leaves 120 without either;
it reports 7 complete, 100 limited and 193 uncovered answers. Public states
remain 263 insufficient and 37 limited. This measures current routing and
coverage, not factual accuracy for arbitrary user claims.

## Household electricity bill components and wholesale prices — 25 November 2026

The text audit also surfaced a recurring claim that taxes, network tolls and
other charges make a household electricity bill move differently from the
wholesale price. Eurostat's annual [household electricity price-components
dataset](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_pc_204_c?freq=A&geo=ES&nrg_cons=KWH2500-4999&currency=EUR&time=2024&time=2025)
reports Spain's 2,500 to less than 5,000 kWh/year consumption band. The three
published aggregate components—energy and supply, network, and taxes/fees/
levies/charges—sum to €0.2383/kWh in 2024 and €0.2638/kWh in 2025. Energy and
supply remained at €0.1108/kWh; network rose from €0.0701 to €0.0712; and
taxes, fees, levies and charges rose from €0.0574 to €0.0818. The
[CNMC's bill explanation](https://www.cnmc.es/ca/node/406175) also describes
network costs, other regulated items, retailer margin, taxes and contract
terms.

This is useful context about how retail components can move differently, but
energy and supply is not the wholesale spot price. The annual component table
does not pair wholesale prices with bills for the same contract and period, so
it cannot show that taxes caused a difference or describe a particular
household's bill. The answer stays insufficient and says which matched data
would be needed. Paraphrases share one explanation; tests cover split-clause
claims, reject unsupported years, regions, named customers and tariff-specific
readings, and keep generic wholesale pass-through questions in their prior
family. The held-out text benchmark passes 239/239 cases across 61 paraphrase
groups; the claim-focus validator covers 357 paraphrases and negative
neighbours.

The refreshed deterministic audit routes 181 of 300 explicitly unverified
discovery claims to a metric or focused family and leaves 119 without either;
it reports 7 complete, 101 limited and 192 uncovered answers. Public states
remain 263 insufficient and 37 limited. These figures describe routing and
coverage, not factual accuracy across user text.

## Postal-area healthcare access — 25 November 2026

The text audit also surfaced a claim that a patient's postal code can affect
access to treatment. The Ministry of Health's [rectified December 2025 SNS
waiting-list report](https://www.sanidad.gob.es/ca/estadEstudios/estadisticas/inforRecopilaciones/docs/LISTAS_PUBLICACION_Dic_2025_rectificado.pdf)
reports that, on 31 December 2025, the average wait for patients on structural
lists for first outpatient consultations ranged from 16 days in Melilla to 162
days in the Canary Islands, aggregated across ten specialties. The Ministry
said in the report, published on 24 September 2026, that December 2025 was the
latest available snapshot; each autonomous community supplies its own figures.
The Ministry's [latest-data page](https://www.sanidad.gob.es/estadEstudios/estadisticas/inforRecopilaciones/listaEspera.htm)
provides the current release status.

These regional averages provide context only. The sources do not break waits
down by postal code, neighbourhood, municipality or individual patient, and do
not compare patients with the same treatment, urgency and severity. The answer
therefore remains insufficient and explains the specific linked wait-list,
referral, appointment, urgency and severity data needed to assess the claim.
Paraphrases and direct questions use the same sources, while the explanation
adapts to causal claims, comparisons or requests for a local wait. Nearby tests
keep Portugal, 2024, primary care, named specialties and region-specific
postal-code claims out of this family while preserving the separate regional
comparison route. The held-out text benchmark passes 242/242 cases across 62
paraphrase groups; the claim-focus validator covers 362 paraphrases and
negative neighbours, and the classifier suite passes.

The refreshed deterministic audit routes 182 of 300 explicitly unverified
discovery claims to a metric or focused family and leaves 118 without either;
it reports 7 complete, 102 limited and 191 uncovered answers. Public states
remain 263 insufficient and 37 limited. These figures describe routing and
coverage, not factual accuracy across user text.

## Dental access, cost barriers and public coverage — 26 November 2026

Two recurring text claims needed different evidence routes: that dental problems
are delayed because private treatment costs too much, and that dental care is
too far outside public coverage. Eurostat's [EU-SILC dental unmet-needs
dataset](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/hlth_silc_09?freq=A&unit=PC&quant_inc=TOTAL&reason=TXP&age=Y_GE16&sex=T&geo=ES&time=2025)
reports 4.0% for Spain in 2025. The denominator is the full population aged 16
and over living in private households, not only people who reported needing
dental care. The indicator is self-reported, covers needs during the previous
12 months and records cost as the main reason for unmet dental need, as set out
in [Eurostat's EU-SILC methodology](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Health_variables_in_SILC_-_methodology).
It does not identify the intended provider, diagnosed problems, treatment
prices or delay length. The answer therefore uses the figure as context and
keeps the stronger claim about many diagnosed problems delayed by private
prices insufficient.

For public coverage, the [consolidated common SNS service basket](https://www.boe.es/buscar/act.php?id=BOE-A-2006-16212&p=20260731&tn=2),
current through 31 July 2026, includes basic dental advice, acute care,
extractions, minor oral surgery and early lesion detection for the whole
population. It defines additional services for specified groups and excludes,
among other items, orthodontics and purely cosmetic care, with exceptions in
the law. Separately, the Ministry of Health's [26 May 2026 update](https://www.sanidad.gob.es/gabinete/notasPrensa.do?id=6917)
reported coverage of 30.4% for children and young people, 25% for pregnant
women and an initial level near 3% for people over 65. The release does not
define the exact measurement period or calculation. These subgroup figures do
not describe all people or all dental procedures. The legal question “what is
covered?” can be answered from the BOE; the evaluative claim that coverage is
“too limited” remains insufficient without a specified treatment, population
and adequacy threshold.

Held-out answer checks now pass 249/249 cases across 66 paraphrase groups; the
claim-focus validator checks 374 formulations, including dental-cost
paraphrases, direct measurement questions, legal-scope questions and nearby
claims that should not inherit this evidence. The refreshed deterministic
audit routes 184 of 300 explicitly unverified discovery claims to a metric or
focused family and leaves 116 without either route. It reports 7 complete, 104
limited and 189 uncovered answers; public states remain 263 insufficient and
37 limited. These figures measure routing and coverage, not factual accuracy
across arbitrary user text.

## Compound text claims and context attribution — 26 November 2026

The deterministic text fallback recognized 43 claims with multiple explicit
clauses, but only 26 public answers retained a structured breakdown. It now
keeps the submitted claim and each clause as separate assessments. A clause can
receive a source only when it resolves to the same reviewed evidence family as
the full claim. Context citations are carried separately from direct evidence,
so showing a relevant source does not turn an unconfirmed clause into a
verified one. The answer page labels those links as context.

Two paraphrases of a compound claim about young workers paying into the pension
system and receiving a lower future pension now use the same AIReF methodology
source on both clauses. That document describes an aggregate projection model,
but its methodology alone does not establish the projected benefit for the
claim's cohort or compare it with a defined current generation. It also does
not predict an individual's pension. Both public answers remain insufficient
and give no invented pension figure. A nearby comparison of current pensions
and young workers' wages remains in its own family and does not inherit the
AIReF source.

The held-out answer benchmark passes 254/254 cases across 67 paraphrase groups;
the claim-focus suite validates 382 formulations and nearby claims. In the
300-claim discovery audit, structured multi-part answers rose from 26 to 43.
Routing and outcome totals are unchanged: 187 candidates match a metric or
focused family, 113 match neither, and deterministic results are 7 complete,
107 limited and 186 uncovered. Public states are 263 insufficient and 37
limited. All 300 discovery claims remain unverified; these counts measure
routing and answer structure, not factual accuracy across arbitrary user text.
