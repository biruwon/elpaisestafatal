import type { InvestigationSection } from './concerns';

export type EpistemicKind = 'measured-fact' | 'project-calculation' | 'interpretation' | 'disputed-interpretation' | 'policy-proposal' | 'insufficient-evidence';
export type EvidenceStrength = 'high' | 'medium' | 'low' | 'disputed';
export const epistemicLabels: Record<EpistemicKind,string> = {
  'measured-fact':'Hecho medido','project-calculation':'Cálculo del proyecto','interpretation':'Interpretación','disputed-interpretation':'Interpretación discutida','policy-proposal':'Propuesta de política','insufficient-evidence':'Evidencia insuficiente',
};
export const strengthLabels: Record<EvidenceStrength,string> = { high:'Alta',medium:'Media',low:'Baja',disputed:'Discutida' };

const proposalIds = new Set(['estrategia','programa','politica','politicas-activas','reformas','prioridades','propuestas','soluciones','respuesta','plan-accion']);
const insufficientIds = new Set(['limites','incertidumbre','datos-limitados','no-sabemos']);
const disputedIds = new Set(['alquiler','smi','inmigracion','automatizacion','regulacion','impuestos-riqueza']);
const calculationIds = new Set(['union','pais-inmigracion','emergencia']);

export function resolveEpistemic(section: InvestigationSection): EpistemicKind {
  if (section.epistemic) return section.epistemic;
  if (proposalIds.has(section.id)) return 'policy-proposal';
  if (insufficientIds.has(section.id)) return 'insufficient-evidence';
  if (disputedIds.has(section.id)) return 'disputed-interpretation';
  if (calculationIds.has(section.id)) return 'project-calculation';
  if (section.chart || section.metrics) return 'measured-fact';
  return 'interpretation';
}
