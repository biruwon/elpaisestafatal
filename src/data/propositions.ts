import type { ClaimType } from '../lib/knowledge/contracts';

export type PropositionRecord = {
  id: string;
  claimSlug: string;
  text: string;
  type: ClaimType;
  subject: string;
  predicate: string;
  object: string | null;
  geography: string;
  period: string;
  status: 'supported' | 'contradicted' | 'qualified' | 'insufficient' | 'unreviewed';
  evidenceIds: string[];
};

const propositionFiles = import.meta.glob('../../content/propositions/*.json', { eager: true, import: 'default' }) as Record<string, PropositionRecord>;

export const propositions = Object.values(propositionFiles).filter((record) => record && typeof record.id === 'string');
export const propositionsByClaim = (claimSlug: string): PropositionRecord[] => propositions.filter((record) => record.claimSlug === claimSlug);
