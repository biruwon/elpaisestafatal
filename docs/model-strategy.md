# Model strategy for open-ended claims

## Product contract

The service accepts any claim about Spain. Acceptance does not imply that every
claim can receive a binary verdict. Every response must end in one of these
useful outcomes:

1. **Data-backed answer** — compatible observations and primary sources answer
   the measurable claim.
2. **Evidence-backed explanation** — sources establish context, definitions or
   chronology, but do not justify a binary verdict.
3. **Clarification** — the wording is too broad to know what evidence would
   answer it.
4. **Insufficient evidence** — the missing evidence is named explicitly and no
   conclusion is invented.

The local model is an interpreter and writer. It is not a source of facts.

## Recommended architecture

Keep the current hybrid pipeline and simplify its public language:

```text
text / URL / image / audio
        ↓
local extraction and claim decomposition
        ↓
deterministic retrieval from reviewed claims + evidence warehouse
        ↓
compatible evidence? ── yes ──> grounded synthesis + citations
        │
        no
        ↓
local model explains the claim, asks one clarification, or states what is missing
        ↓
unresolved claims enter the asynchronous research and review queue
```

Hard boundaries:

- The model may normalize wording, split compound claims, select among already
  compatible candidates, and synthesize an evidence packet.
- The model may not create measurements, sources, URLs, dates or verdicts.
- A factual sentence in the answer must be traceable to an evidence ID.
- Rhetorical and causal claims must expose the narrower measurable dimensions
  used to discuss them.
- Current events without fresh sources return a limitation, not model memory.

## Existing model vs fine-tuning

Use an existing instruction/vision model behind the provider-neutral contract
for now. Keep the exact model configurable and select it with the repository's
evaluation corpus on the actual target machine. The useful metrics are schema
validity, claim-decomposition accuracy, evidence-selection precision, citation
coverage, unsupported-fact rate, latency and memory use—not general chatbot
rankings.

Do **not** fine-tune factual knowledge. It becomes stale, is difficult to cite,
and weakens the evidence boundary. Retrieval and reviewed snapshots should own
facts.

Consider a small adapter fine-tune only after the system has at least 1,000
reviewed, de-duplicated examples and a frozen holdout set. Limit that training
to stable tasks:

- Spanish claim decomposition and type classification;
- clarification-question selection;
- structured routing to metric families;
- grounded response style using supplied evidence.

Promote a fine-tuned model only if it improves the frozen evaluation set without
raising unsupported-fact rate, p95 latency or operational cost beyond the agreed
budget. Retain deterministic fallbacks and the provider-neutral interface.

## Near-term priorities

1. Expand primary-source connectors and freshness checks for high-volume gaps.
2. Capture anonymous resolution outcomes and reviewer corrections as evaluation
   data, not as automatic truth.
3. Benchmark several local model sizes using identical prompts and evidence
   packets; choose the smallest model that clears the quality gates.
4. Add speech transcription and vision extraction health to the public health
   boundary so media failures degrade visibly.
5. Report coverage by claim family: answered with data, answered with context,
   clarification requested, and insufficient.
