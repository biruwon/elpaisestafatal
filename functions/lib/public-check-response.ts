import type { AnswerPlan } from '../../src/lib/knowledge/contracts';
import type { CatalogueEntry } from '../../src/data/catalogue';
import type { PublicCheckResponse } from '../../src/lib/knowledge/public-check';

const sourceLinks = (plan?: AnswerPlan): PublicCheckResponse['sources'] => (plan?.sourceLinks || []).map((source) => ({
  id: source.id,
  title: source.title,
  publisher: source.publisher,
  url: source.url,
  publishedAt: source.publishedAt,
  retrievedAt: source.retrievedAt,
}));

const replyFromPlan = (plan?: AnswerPlan): string => {
  const reply = plan?.blocks?.find((block) => block.type === 'conversation_reply');
  return reply?.type === 'conversation_reply' ? reply.text : plan?.summary || '';
};

const visualFromCatalogue = (entry: CatalogueEntry): PublicCheckResponse['visual'] => {
  const visual = entry.visual;
  if (!visual || visual.type === 'none' || !visual.labels?.length || !visual.values?.length) return undefined;
  if (visual.labels.length !== visual.values.length || !visual.evidenceIds.length) return undefined;
  if (visual.evidenceIds.some((id) => !entry.evidenceIds.includes(id))) return undefined;
  if (entry.basis === 'sourced' && !entry.sources.length) return undefined;
  if (visual.values.some((value) => !Number.isFinite(value))) return undefined;
  return { type: visual.type, title: visual.title, unit: visual.unit, labels: visual.labels, values: visual.values, evidenceIds: visual.evidenceIds };
};

export const checkFromCatalogue = (claim: string, entry: CatalogueEntry): PublicCheckResponse => ({
  id: entry.id,
  status: 'complete',
  claim,
  answer: entry.answer,
  basis: entry.basis,
  explanation: entry.explanation,
  limitations: entry.limitations,
  reply: entry.reply,
  sources: entry.sources.map((source) => ({
    id: source.id,
    title: source.title,
    publisher: source.publisher,
    url: source.url,
    publishedAt: source.date,
  })),
  visual: visualFromCatalogue(entry),
  catalogueEntry: { slug: entry.slug, href: `/afirmaciones/${entry.slug}` },
  generatedAt: new Date().toISOString(),
});

export const checkFromPlan = (claim: string, plan: AnswerPlan, requestId?: string): PublicCheckResponse => ({
  id: requestId || `check-${Date.now().toString(36)}`,
  status: 'complete',
  claim,
  answer: plan.summary || plan.headline,
  basis: plan.reviewed === true && plan.evidenceIds.length > 0 && plan.sourceIds.length > 0 && sourceLinks(plan).length > 0 ? 'sourced' : 'model',
  explanation: plan.headline,
  limitations: [plan.limitation].filter((value): value is string => Boolean(value)),
  reply: replyFromPlan(plan),
  sources: sourceLinks(plan),
  generatedAt: plan.asOf || new Date().toISOString(),
});

export const unavailableCheck = (claim: string, explanation: string): PublicCheckResponse => ({
  id: `unavailable-${Date.now().toString(36)}`,
  status: 'unavailable',
  claim,
  answer: 'No podemos completar esta comprobación ahora.',
  basis: 'model',
  explanation,
  limitations: ['La respuesta no ha podido verificarse ni generarse con el modelo local.'],
  reply: 'No puedo comprobarlo ahora con suficiente seguridad.',
  sources: [],
  generatedAt: new Date().toISOString(),
});

export const processingCheck = (claim: string, requestId: string): PublicCheckResponse => ({
  id: requestId,
  status: 'processing',
  claim,
  answer: 'Estamos preparando la comprobación.',
  basis: 'model',
  explanation: 'La solicitud necesita procesamiento adicional.',
  limitations: ['La respuesta todavía no está lista.'],
  reply: 'Estoy preparando una comprobación con las fuentes disponibles.',
  sources: [],
  generatedAt: new Date().toISOString(),
});
