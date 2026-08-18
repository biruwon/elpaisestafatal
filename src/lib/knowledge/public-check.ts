export type CheckBasis = 'sourced' | 'model';
export type CheckStatus = 'complete' | 'processing' | 'unavailable';

export type CheckSource = {
  id: string;
  title: string;
  publisher?: string;
  url: string;
  publishedAt?: string;
  retrievedAt?: string;
};

export type CheckVisual = {
  type: 'line' | 'bar' | 'comparison' | 'money-flow';
  title?: string;
  unit?: string;
  labels: string[];
  values: number[];
  evidenceIds: string[];
};

export type PublicCheckResponse = {
  id: string;
  status: CheckStatus;
  claim: string;
  answer: string;
  basis: CheckBasis;
  explanation: string;
  limitations: string[];
  reply: string;
  sources: CheckSource[];
  visual?: CheckVisual;
  catalogueEntry?: { slug: string; href: string };
  generatedAt: string;
};

export const checkResponse = (value: unknown): value is PublicCheckResponse => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<PublicCheckResponse>;
  return typeof item.id === 'string'
    && item.id.length > 0
    && (item.status === 'complete' || item.status === 'processing' || item.status === 'unavailable')
    && typeof item.claim === 'string'
    && typeof item.answer === 'string'
    && (item.basis === 'sourced' || item.basis === 'model')
    && typeof item.explanation === 'string'
    && Array.isArray(item.limitations)
    && typeof item.reply === 'string'
    && Array.isArray(item.sources)
    && item.sources.every((source) => Boolean(source) && typeof source.id === 'string' && typeof source.title === 'string' && typeof source.url === 'string' && /^https?:\/\//.test(source.url))
    && typeof item.generatedAt === 'string';
};

export const modelCheck = (claim: string, answer: string, explanation: string, limitations: string[] = []): PublicCheckResponse => ({
  id: `model-${Date.now().toString(36)}`,
  status: 'complete',
  claim,
  answer,
  basis: 'model',
  explanation,
  limitations,
  reply: answer,
  sources: [],
  generatedAt: new Date().toISOString(),
});
