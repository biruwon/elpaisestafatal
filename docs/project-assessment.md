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
screen labels this as what is missing to check each part. When the generic
uncovered fallback receives a claim longer than the compiler's 300-character
limit, it says that the whole text was not analyzed and asks for a shorter
claim.

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
same concise qualification. Neither can retain its copyable whole-claim
sentence. Answers already marked insufficient are left at their existing
length. Paraphrases of a causal employment claim, a limited-evidence variant,
and a nearby single-part employment claim exercise the boundary in both paths.
