import type { Concern, Source } from './concerns';

export function concernSources(concern:Concern):Source[]{
  const candidates:Source[]=[...concern.sources,concern.dossier.source];
  for(const section of concern.investigation?.sections??[]){
    if(section.source)candidates.push(section.source);
    if(section.chart?.source)candidates.push(section.chart.source);
  }
  return [...new Map(candidates.filter(Boolean).map(source=>[source.url,source])).values()];
}

export const projectMetadata={
  contentNote:'Contenido generado y organizado con ayuda de IA a partir de fuentes públicas',
  funding:'Sin financiación externa',
  calculationMethod:'Fuentes originales, cálculos versionados y límites publicados',
  repository:'https://github.com/biruwon/elpaisestafatal',
};
