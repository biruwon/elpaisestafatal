import type { Source } from './concerns';

export type EvidenceKind='statistical-series'|'legal-text'|'dataset'|'chart'|'definition'|'study'|'official-report'|'methodological-caveat';
export type EvidenceObject={id:string;kind:EvidenceKind;title:string;source:Source;period?:string;unit?:string;geography?:string;limitation?:string};
export type RegionalEvidence={id:string;title:string;period:string;unit:string;geography:'Spain'|'autonomous-community';source:Source;comparabilityCaveat:string};

export const evidenceId=(source:Source)=>source.label.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const evidenceFromSource=(source:Source, limitation?:string):EvidenceObject=>({id:evidenceId(source),kind:'official-report',title:source.label,source,geography:'Spain',limitation});
