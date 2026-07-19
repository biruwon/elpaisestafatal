import type { ClaimIndexEntry, RankedClaimIndexEntry } from '../../data/claimIndex';
import type { CoverageStatus } from './contracts';

export type DeterministicCoverage = {
  status: CoverageStatus;
  reason: string;
  entry?: ClaimIndexEntry;
};

const usableEvidence = (entry: ClaimIndexEntry): boolean => Boolean(
  entry.evidenceStrength && entry.evidenceStrength !== 'insufficient' && (entry.evidenceIds?.length || entry.sourceRefs?.length),
);

export const classifyDeterministicCoverage = (entry: RankedClaimIndexEntry | undefined): DeterministicCoverage => {
  if (!entry) return { status: 'insufficient', reason: 'No hay una afirmación publicada suficientemente cercana.' };
  if (entry.kind === 'claim' && entry.score >= 68 && usableEvidence(entry)) {
    return { status: 'strong', reason: 'La formulación coincide con una afirmación publicada respaldada por fuentes.', entry };
  }
  if (entry.score >= 36 && usableEvidence(entry)) {
    return { status: 'qualified', reason: 'Hay una relación temática útil, pero no una coincidencia exacta.', entry };
  }
  if (entry.score >= 24) {
    return { status: 'partial', reason: 'Solo hay una relación parcial; no debe presentarse como respuesta a la afirmación.', entry };
  }
  return { status: 'insufficient', reason: 'La coincidencia no es suficientemente sólida para orientar la respuesta.' };
};
