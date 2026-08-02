# Published claim propositions

Each JSON record is the smallest typed statement currently used to route a published claim to its reusable evidence. A claim may later be decomposed into more propositions as the evidence model becomes richer.

Required fields:

```json
{
  "id": "prop-example-core",
  "claimSlug": "example",
  "text": "A testable statement",
  "type": "descriptive",
  "subject": "entity",
  "predicate": "has",
  "object": "property",
  "geography": "España",
  "period": "2025-2026",
  "status": "supported",
  "evidenceIds": ["evidence-id"]
}
```
