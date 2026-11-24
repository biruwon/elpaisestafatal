import { RUNTIME_VERSIONS } from './runtime-versions.mjs';
import { GOVERNMENT_SCORECARD_SNAPSHOT, snapshotScorecard } from './scorecard-snapshot.mjs';
import { answerPlanForBroadDomains } from './broad-domain-snapshot.mjs';
import { snapshotLifecycle } from './snapshot-lifecycle.mjs';
import { WORKING_POVERTY_SNAPSHOT } from './working-poverty-snapshot.mjs';
import { SUBJECTIVE_POVERTY_SNAPSHOT } from './subjective-poverty-snapshot.mjs';
import { EDUCATION_EMPLOYMENT_SNAPSHOT } from './education-employment-snapshot.mjs';
import { PRIMARY_CARE_WAIT_SNAPSHOT } from './primary-care-wait-snapshot.mjs';
import { TOURISM_EMPLOYMENT_SNAPSHOT } from './tourism-employment-snapshot.mjs';
import { EDUCATION_EARNINGS_SNAPSHOT } from './education-earnings-snapshot.mjs';
import { TOURIST_HOUSING_SNAPSHOT } from './tourist-housing-snapshot.mjs';
import { spanishInstitutionalScope } from './institutional-scope.mjs';
import { measurementMeaningPlan } from './measurement-meaning.mjs';
import { focusedEvidencePlan } from './focused-evidence-plan.mjs';
import { governmentScorecardGapPlan, isBroadGovernmentScorecardClaim } from './scorecard-interpretation.mjs';
import { deterministicFallbackCompiler, FALLBACK_CLAIM_MAX_CHARS } from '../../../scripts/knowledge/fallback-compiler.mjs';

const topicQuestion = (text) => {
  const value = String(text || '').toLocaleLowerCase('es');
  if (/sanchez|presidente|gobierno|moncloa|psoe|pp|vox|sumar|politic|destru|ruina|fatal|desastr|cuesta abajo/.test(value)) return '¿Hablas de una decisión del Gobierno, economía, vivienda, empleo, inmigración o instituciones?';
  if (/viviend|alquiler|piso|casa/.test(value)) return '¿Hablas de precios, alquileres, vivienda pública o disponibilidad?';
  if (/inmigr|extranj|patera|ayuda|prestaci/.test(value)) return '¿Hablas de población, ayudas, empleo, llegadas o seguridad?';
  if (/empleo|trabaj|paro|salario|sueldo/.test(value)) return '¿Qué medida quieres comprobar: empleo, paro, salario, jornada o estabilidad?';
  if (/impuest|hacienda|recaud|deuda|gasto público/.test(value)) return '¿Qué impuesto, gasto, periodo o comparación quieres comprobar?';
  if (/sanidad|hospital|médic|medic|espera/.test(value)) return '¿Hablas de acceso, listas de espera, gasto, personal o resultados?';
  return '¿Qué hecho concreto, periodo o lugar quieres comprobar?';
};

const topicReference = (text) => {
  const value = String(text || '').toLocaleLowerCase('es');
  if (/sanchez|presidente|gobierno|moncloa|psoe|pp|vox|sumar|politic|destru|ruina|fatal|desastr|cuesta abajo/.test(value)) {
    return { kind: 'topic', slug: 'politica', title: 'Contexto político en España', href: '/preocupaciones/politica', confidence: 0.36 };
  }
  if (/econom[ií]a/.test(value) && /empleo|trabaj|paro|salario|sueldo/.test(value)) {
    return { kind: 'topic', slug: 'empleo', title: 'Empleo y condiciones de trabajo', href: '/preocupaciones/empleo', confidence: 0.36 };
  }
  return undefined;
};

// A reviewed family may add useful context when a focused measurement plan
// has no observations. Keep these bridges explicit so related context cannot
// replace a claim-specific measurement or its scope.
const reviewedContextForFocusedGap = {
  'measurement-intergenerational-housing-distribution': {
    packetId: 'broad-youth-living-housing',
    criterionId: 'intergenerational-young-renting-trend',
    evidenceGap: () => ({
      missing: [
        'vinculación entre el alquiler pagado por hogares jóvenes y la edad de quienes lo reciben',
        'precios de compra por cohorte, periodo, territorio y vivienda comparables',
        'propiedad residencial desglosada por edad que incluya personas y sociedades',
        'comparación equivalente de patrimonio, ingresos y salarios por edad y régimen de tenencia',
      ],
      needed: [
        'datos emparejados de hogares arrendatarios, arrendadores e importes netos del alquiler',
        'precios de adquisición, patrimonio residencial e ingresos laborales por cohorte y periodo',
      ],
      nextAction: 'Buscar una fuente que cruce pagos de alquiler y propiedad por edades y compare precios de compra entre cohortes; los datos de acceso juvenil no miden por sí solos transferencias entre generaciones.',
    }),
  },
  'measurement-rental-affordability': {
    packetId: 'broad-youth-living-housing',
    criterionId: 'youth-rental-effort',
    evidenceGap: () => ({
      missing: ['distribución de jóvenes según el porcentaje de renta individual destinado al alquiler'],
      needed: ['renta personal y gasto en alquiler cruzados por edad, periodo y territorio'],
      nextAction: 'Buscar una fuente que publique la distribución individual del esfuerzo de alquiler; el promedio no indica cuántos jóvenes superan un umbral.',
    }),
  },
  'measurement-purchase-affordability': {
    packetId: 'broad-youth-living-housing',
    criterionId: 'youth-purchase-effort',
    evidenceGap: (claim) => {
      const asksAboutFamilySupport = /padres|progenit|famil|herenc|patrimoni|ayud/i.test(String(claim || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
      return {
        missing: [
          'proporción de jóvenes que puede reunir la entrada y pagar la cuota hipotecaria',
          ...(asksAboutFamilySupport ? ['efecto de las ayudas familiares o herencias en el acceso a la compra'] : []),
        ],
        needed: [
          'ahorro disponible, ingresos del hogar, precio local y condiciones hipotecarias comparables',
          ...(asksAboutFamilySupport ? ['transferencias o herencias recibidas y una comparación que permita medir su efecto'] : []),
        ],
        nextAction: asksAboutFamilySupport
          ? 'Buscar datos de acceso a la compra por hogar y separar la barrera económica del efecto de la ayuda familiar o la herencia.'
          : 'Buscar datos de acceso a la compra por hogar, con ahorro, ingresos, precio local y financiación comparables.',
      };
    },
  },
};

const reviewedContextForGap = (focused, claim, now) => {
  const bridge = reviewedContextForFocusedGap[focused?.id];
  if (!bridge || focused.evidenceLevel !== 'insufficient'
    || focused.evidenceIds?.length || focused.sourceIds?.length) return undefined;
  const plan = answerPlanForBroadDomains(claim, { now });
  if (plan?.id !== bridge.packetId || plan.evidenceLevel === 'insufficient') return undefined;
  const planSources = new Set(plan.sourceIds || []);
  const sourcedFamily = plan.evidenceSummary?.families?.some((family) => family.criterionId === bridge.criterionId
    && family.data?.length
    && family.sourceIds?.some((sourceId) => planSources.has(sourceId)));
  if (!sourcedFamily) return undefined;

  const gap = bridge.evidenceGap(claim);
  const blocks = [...(plan.blocks || [])];
  const conclusionIndex = blocks.findIndex((block) => block.type === 'cannot_conclude');
  blocks.splice(conclusionIndex < 0 ? blocks.length : conclusionIndex, 0, {
    type: 'evidence_gap',
    ...gap,
  });
  return { ...plan, blocks };
};

const fallbackGuidance = (text, inputType, analysisWasTruncated = false) => {
  if (!text) {
    const subject = inputType === 'audio' ? 'el audio' : inputType === 'image' ? 'la captura' : 'el contenido';
    return {
      limitation: `No hemos podido leer ${subject} ahora. Puedes escribir o pegar la frase para comprobarla directamente.`,
      questions: ['Escribe la frase, titular o mensaje que quieres comprobar.'],
    };
  }
  if (analysisWasTruncated) {
    return {
      limitation: `El análisis automático de respaldo solo interpreta los primeros ${FALLBACK_CLAIM_MAX_CHARS} caracteres. Selecciona una afirmación concreta o divídela antes de comprobarla.`,
      questions: [`¿Qué afirmación concreta de hasta ${FALLBACK_CLAIM_MAX_CHARS} caracteres quieres comprobar?`],
    };
  }
  return {
    limitation: 'No se ha localizado evidencia compatible en las fuentes revisadas disponibles para esta comprobación. Esto no demuestra que la afirmación sea falsa; concretar el periodo, territorio y medida puede ayudar a buscar mejor.',
    questions: [topicQuestion(text)],
  };
};

const focusedFollowUp = (plan, fallback) => {
  const family = plan?.answerScope?.family;
  if (family === 'matched-pay') return { limitation: plan.limitation, questions: ['¿Qué profesión, país y perfil (edad, estudios, experiencia y jornada) quieres comparar?'] };
  if (family === 'employer-contributions-labour-cost') return {
    limitation: plan.limitation,
    questions: ['¿Quieres cuantificar la diferencia para un empleo y año concretos, o comprobar qué saben los trabajadores sobre ella?'],
  };
  if (family === 'foreign-new-build-local-affordability') return {
    limitation: plan.limitation,
    questions: ['¿Qué provincia costera y qué ingresos locales quieres usar para comprobar la asequibilidad?'],
  };
  return fallback;
};

export const deterministicApiFallback = ({ text = '', inputType = 'text', now = Date.now() } = {}) => {
  const original = String(text || '').trim().slice(0, 1200);
  const analysisWasTruncated = original.length > FALLBACK_CLAIM_MAX_CHARS;
  const guidance = fallbackGuidance(original, inputType, analysisWasTruncated);
  if (!original) return { status: 'uncovered', relatedClaims: [], guidance };
  // Never let a match found in the parsed prefix stand in for a longer claim.
  // The fallback compiler only interprets 300 characters, while public text
  // submissions can be much longer.
  const meaning = analysisWasTruncated ? undefined : measurementMeaningPlan(original);
  if (meaning) return { status: 'complete', result: meaning, relatedClaims: [] };
  // A focused answer must not erase a second independent proposition while
  // the warehouse-backed resolver is unavailable or still processing.
  const compiledClaim = deterministicFallbackCompiler(original);
  const requestedStartYear = !analysisWasTruncated
    && compiledClaim.evidenceNeeds?.includes('periodo')
    && !compiledClaim.evidenceNeeds.some((need) => ['causa', 'fecha', 'norma', 'programa'].includes(need))
    && /\bdesde\b/.test(String(compiledClaim.normalized || '').toLocaleLowerCase('es'))
    && /^\d{4}$/.test(String(compiledClaim.period || ''))
    ? String(compiledClaim.period)
    : undefined;
  const propositions = (compiledClaim.explicitPropositions || []).filter((proposition) => proposition?.explicit !== false && proposition?.text);
  const fallbackSnapshots = inputType === 'text'
    ? [WORKING_POVERTY_SNAPSHOT, SUBJECTIVE_POVERTY_SNAPSHOT, EDUCATION_EMPLOYMENT_SNAPSHOT, EDUCATION_EARNINGS_SNAPSHOT, PRIMARY_CARE_WAIT_SNAPSHOT, TOURISM_EMPLOYMENT_SNAPSHOT, TOURIST_HOUSING_SNAPSHOT].filter((snapshot) => snapshotLifecycle(snapshot, now).usable)
    : [];
  const fallbackObservations = fallbackSnapshots.flatMap((snapshot) => snapshot.observations);
  const focused = analysisWasTruncated ? undefined : focusedEvidencePlan(original, { observations: fallbackObservations, propositions, now, allowReviewedSnapshotFallback: true });
  const related = topicReference(original);
  if (focused) {
    const reviewedContext = reviewedContextForGap(focused, original, now);
    if (reviewedContext) {
      return {
        status: 'complete',
        evidenceLevel: reviewedContext.evidenceLevel,
        relatedClaims: related ? [related] : [],
        guidance: focusedFollowUp(reviewedContext, { limitation: reviewedContext.limitation, questions: ['¿Quieres concretar el periodo, territorio o indicador?'] }),
        result: reviewedContext,
      };
    }
    return {
      status: focused.evidenceLevel === 'limited' || focused.sourceIds?.length ? 'partial' : 'uncovered',
      result: focused,
      relatedClaims: [],
      guidance: focusedFollowUp(focused, guidance),
    };
  }
  const scorecardLifecycle = snapshotLifecycle(GOVERNMENT_SCORECARD_SNAPSHOT, now);
  const scorecardEnabled = typeof process === 'undefined' || process.env?.BROAD_SCORECARD !== '0';
  if (!analysisWasTruncated && isBroadGovernmentScorecardClaim(original) && (!scorecardLifecycle.usable || !scorecardEnabled)) {
    const gapPlan = governmentScorecardGapPlan(now, { disabled: !scorecardEnabled });
    return {
      status: 'uncovered',
      relatedClaims: related ? [related] : [],
      guidance: { limitation: gapPlan.limitation, questions: [gapPlan.clarificationQuestion] },
      result: gapPlan,
    };
  }
  const institutionalLabel = analysisWasTruncated ? undefined : spanishInstitutionalScope(original);
  if (institutionalLabel) {
    const evidenceIds = ['fallback-constitution', 'fallback-congress'];
    const sources = [
      { id: 'fallback-constitution', title: 'Constitución Española · Estado social y democrático de Derecho', publisher: 'BOE', url: 'https://www.boe.es/legislacion/documentos/ConstitucionCASTELLANO.pdf' },
      { id: 'fallback-congress', title: 'Congreso de los Diputados · Funciones y control parlamentario', publisher: 'Congreso de los Diputados', url: 'https://www.congreso.es/funciones' },
    ];
    return {
      status: 'complete', evidenceLevel: 'supported', relatedClaims: [], guidance: { limitation: 'La etiqueta se contrasta con rasgos institucionales observables, no con una valoración partidista.' },
      result: {
        schemaVersion: '1', evidenceLevel: 'limited', headline: 'El marco constitucional permite comprobar instituciones, no todas sus actuaciones',
        summary: 'La Constitución establece un sistema parlamentario, derechos y controles del poder. Ese marco aporta contexto institucional, pero su existencia no demuestra por sí sola cómo se cumple en la práctica ni resuelve una acusación concreta.', coverage: 'qualified', claimType: 'definition',
        blocks: [
          { type: 'confirmed', propositionIds: [], evidenceIds, points: ['La Constitución define un Estado democrático y parlamentario.', 'El Gobierno está sometido al control del Congreso y a las leyes y tribunales.'] },
          { type: 'cannot_conclude', evidenceIds, points: ['Esto no impide examinar decisiones concretas por abuso de poder, ilegalidad o mala gestión.'] },
          { type: 'conversation_reply', evidenceIds, text: 'La Constitución española establece un sistema parlamentario, derechos y controles judiciales y del Congreso. Es el marco para examinar la afirmación. Para valorar cómo se ejerce el poder en la práctica hacen falta hechos concretos y evidencia sobre elecciones, libertades y funcionamiento de esos controles. La norma, por sí sola, no demuestra su cumplimiento ni descarta abusos.' },
        ], limitation: 'La conclusión se refiere a la etiqueta institucional general, no a la legalidad o calidad de cada decisión.', evidenceIds, sourceIds: evidenceIds, sourceLinks: sources, knowledgeVersion: RUNTIME_VERSIONS.fallbackKnowledge,
      },
    };
  }
  if (!analysisWasTruncated && isBroadGovernmentScorecardClaim(original) && scorecardLifecycle.usable && scorecardEnabled) {
    return {
      status: 'complete',
      evidenceLevel: 'supported',
      relatedClaims: related ? [related] : [],
      guidance: { limitation: 'La valoración política es demasiado amplia para una nota única. Mostramos los seis indicadores que deben compararse.', questions: ['¿Quieres abrir un indicador concreto del cuadro?'] },
      result: {
        schemaVersion: '1',
        evidenceLevel: 'supported',
        headline: 'La mayoría de indicadores mejoran, pero no hay una nota partidista',
        summary: `No se puede concluir que ${original} a partir de este cuadro. Entre 2017 y 2025, ${GOVERNMENT_SCORECARD_SNAPSHOT.metrics.filter((metric) => metric.direction === 'improved').length} de ${GOVERNMENT_SCORECARD_SNAPSHOT.metrics.length} indicadores mejoran y ${GOVERNMENT_SCORECARD_SNAPSHOT.metrics.filter((metric) => metric.direction === 'worsened').length} empeora. El cuadro describe cambios observados, pero no identifica qué políticas los causaron ni establece una medida única de “destrucción del país”.`,
        coverage: 'qualified',
        claimType: 'comparative',
        blocks: [snapshotScorecard(), { type: 'cannot_conclude', evidenceIds: [], points: ['Estos indicadores no producen una calificación global de la izquierda o la derecha.', 'La coincidencia temporal no demuestra causalidad gubernamental.'] }],
        clarificationQuestion: 'Puedes abrir un indicador concreto para ver qué mide y sus fuentes.',
        limitation: `Base: ${GOVERNMENT_SCORECARD_SNAPSHOT.periods['since-2018'].assumption}`,
        evidenceIds: GOVERNMENT_SCORECARD_SNAPSHOT.metrics.flatMap((metric) => metric.sourceIds),
        sourceIds: GOVERNMENT_SCORECARD_SNAPSHOT.sources.map((source) => source.id),
        asOf: GOVERNMENT_SCORECARD_SNAPSHOT.asOf,
        sourceLinks: GOVERNMENT_SCORECARD_SNAPSHOT.sources,
        snapshotPolicy: { owner: GOVERNMENT_SCORECARD_SNAPSHOT.owner, createdAt: GOVERNMENT_SCORECARD_SNAPSHOT.createdAt, expiresAt: GOVERNMENT_SCORECARD_SNAPSHOT.expiresAt, refreshCommand: GOVERNMENT_SCORECARD_SNAPSHOT.refreshCommand, validationStatus: GOVERNMENT_SCORECARD_SNAPSHOT.validationStatus, supportedScope: GOVERNMENT_SCORECARD_SNAPSHOT.supportedScope, unsupportedScope: GOVERNMENT_SCORECARD_SNAPSHOT.unsupportedScope },
        evidenceSummary: {
          mode: 'snapshot',
          families: GOVERNMENT_SCORECARD_SNAPSHOT.metrics.map((metric) => ({ label: metric.label, direction: 'qualifies', evidenceIds: metric.sourceIds })),
          fallbackReason: 'Este cuadro es un snapshot revisado para ofrecer contexto cuando no se está respondiendo con una única serie dinámica.',
        },
        knowledgeVersion: RUNTIME_VERSIONS.fallbackKnowledge,
      },
    };
  }
  const broadDomainPlan = analysisWasTruncated ? undefined : answerPlanForBroadDomains(original, { now });
  if (broadDomainPlan) {
    return {
      status: 'complete',
      evidenceLevel: broadDomainPlan.evidenceLevel,
      relatedClaims: related ? [related] : [],
      guidance: { limitation: broadDomainPlan.limitation, questions: [broadDomainPlan.id === 'broad-housing' ? '¿Hablas de precios, alquileres, vivienda pública o disponibilidad?' : '¿Quieres concretar el periodo, territorio o indicador?'] },
      result: broadDomainPlan,
    };
  }
  const fullyAnalyzedCompound = !analysisWasTruncated && propositions.length > 1;
  const breakdownItems = fullyAnalyzedCompound
    ? [
      {
        text: original,
        type: compiledClaim.claimType || 'mixed',
        explicit: true,
        verdict: 'insufficient',
        evidenceLevel: 'none',
        finding: compiledClaim.claimType === 'causal'
          ? 'No se ha localizado evidencia compatible que permita valorar la relación causal completa.'
          : 'No se ha localizado evidencia compatible para evaluar la afirmación completa.',
      },
      ...propositions.map((proposition) => ({
        text: proposition.text,
        type: proposition.type || compiledClaim.claimType || 'mixed',
        explicit: true,
        verdict: 'insufficient',
        evidenceLevel: 'none',
        finding: 'No se han localizado datos compatibles para evaluar esta parte por separado.',
      })),
    ]
    : [{
      text: original,
      type: analysisWasTruncated ? 'mixed' : compiledClaim.claimType || 'mixed',
      explicit: true,
      verdict: 'insufficient',
      evidenceLevel: 'none',
      finding: analysisWasTruncated
        ? `El analizador de respaldo solo interpretó los primeros ${FALLBACK_CLAIM_MAX_CHARS} caracteres; no se pudo evaluar el texto completo.`
        : 'No se han localizado datos o fuentes compatibles para evaluar esta afirmación.',
    }];
  const missing = fullyAnalyzedCompound
    ? [
      'evidencia compatible para cada parte explícita de la afirmación',
      ...(compiledClaim.claimType === 'causal' ? ['evidencia que permita valorar la relación causal entre esas partes'] : []),
      ...(compiledClaim.claimType === 'normative' ? ['criterio de valoración que se aplicará a la afirmación completa'] : []),
    ]
    : analysisWasTruncated
      ? [`interpretación y comprobación del texto posterior a los primeros ${FALLBACK_CLAIM_MAX_CHARS} caracteres`]
      : requestedStartYear
        ? [`observación del indicador en el año inicial solicitado (${requestedStartYear})`]
      : compiledClaim.claimType === 'causal'
        ? ['datos compatibles para las partes relacionadas', 'evidencia que permita valorar el vínculo causal']
        : compiledClaim.claimType === 'predictive'
          ? ['resultado previsto y plazo definido', 'supuestos de la proyección y evidencia de resultados observados']
          : compiledClaim.claimType === 'legal'
            ? ['jurisdicción y norma vigente', 'hechos concretos que permitan aplicar la norma']
            : compiledClaim.claimType === 'normative'
              ? ['criterio de valoración explícito', 'afirmaciones factuales que puedan comprobarse por separado']
              : ['una fuente compatible con el indicador, la población, el territorio y el periodo de la afirmación'];
  const needed = fullyAnalyzedCompound
    ? [
      'una fuente que mida cada parte con su población, territorio y periodo',
      ...(compiledClaim.claimType === 'causal' ? ['un diseño o comparación que permita evaluar el vínculo causal'] : []),
      ...(['comparative', 'mixed'].includes(compiledClaim.claimType) ? ['definiciones, periodos y denominadores comparables'] : []),
    ]
    : analysisWasTruncated
      ? ['una afirmación concreta dentro del límite analizado', 'una fuente compatible con su población, territorio y periodo']
      : requestedStartYear
        ? [`serie del mismo indicador que incluya ${requestedStartYear} y el periodo final, con territorio y unidad compatibles`]
      : compiledClaim.claimType === 'causal'
        ? ['medidas comparables de los hechos relacionados', 'evidencia del mecanismo o diseño que permita atribuir causalidad']
        : compiledClaim.claimType === 'predictive'
          ? ['una proyección publicada con plazo y supuestos explícitos', 'una medida que permita evaluar el resultado previsto']
          : compiledClaim.claimType === 'legal'
            ? ['la norma vigente en la jurisdicción pertinente', 'los hechos concretos a los que se aplicaría']
            : compiledClaim.claimType === 'normative'
              ? ['un criterio explícito para la valoración', 'los hechos que puedan comprobarse por separado']
              : ['una fuente pública que mida directamente la afirmación', 'población, territorio y periodo definidos'];
  const nextAction = fullyAnalyzedCompound
    ? compiledClaim.claimType === 'causal'
      ? 'Comprobar cada parte por separado y buscar evidencia del vínculo causal; que dos hechos coincidan no demuestra que uno cause el otro.'
      : 'Buscar evidencia para cada parte con población, territorio y periodo explícitos antes de resumirlas juntas.'
    : analysisWasTruncated
      ? `Seleccionar una frase concreta de hasta ${FALLBACK_CLAIM_MAX_CHARS} caracteres para evitar omitir el resto del texto.`
      : requestedStartYear
        ? `Buscar una serie del mismo indicador que incluya ${requestedStartYear} y comparar los periodos con la misma definición, territorio y unidad.`
      : compiledClaim.claimType === 'causal'
        ? 'Separar los hechos relacionados y buscar un estudio o comparación que permita valorar el vínculo causal.'
        : compiledClaim.claimType === 'predictive'
          ? 'Fijar qué resultado y plazo se predicen y contrastarlos con un escenario publicado y sus supuestos.'
          : compiledClaim.claimType === 'legal'
            ? 'Concretar la jurisdicción y los hechos del caso, y consultar la norma vigente aplicable.'
            : compiledClaim.claimType === 'normative'
              ? 'Acordar el criterio de valoración y comprobar por separado las afirmaciones factuales.'
              : 'Concretar el indicador, la población, el territorio y el periodo, y contrastarlos con una fuente primaria.';
  const clarificationQuestion = analysisWasTruncated
    ? guidance.questions[0]
    : compiledClaim.claimType === 'causal'
      ? '¿Qué hechos, población y periodo quieres usar para comprobar también el vínculo causal?'
      : compiledClaim.claimType === 'predictive'
        ? '¿Qué resultado y horizonte temporal quieres comprobar?'
        : compiledClaim.claimType === 'legal'
          ? '¿En qué jurisdicción y sobre qué hechos concretos quieres comprobar la norma?'
          : compiledClaim.claimType === 'normative'
            ? '¿Qué criterio explícito quieres usar para valorar esta prioridad?'
            : fullyAnalyzedCompound
              ? '¿Qué parte quieres comprobar primero y con qué población, territorio y periodo?'
              : guidance.questions[0];
  return {
    status: 'uncovered',
    relatedClaims: related ? [related] : [],
    guidance,
    result: {
      schemaVersion: '1',
      evidenceLevel: 'insufficient',
      headline: 'No hay evidencia suficiente todavía',
      summary: analysisWasTruncated
        ? `El analizador de respaldo solo interpreta los primeros ${FALLBACK_CLAIM_MAX_CHARS} caracteres, así que no puede evaluar el texto completo. No se ha localizado evidencia compatible dentro de esa parte; esto no permite concluir sobre el resto ni demuestra que la afirmación sea falsa.`
        : 'No se ha localizado evidencia compatible en las fuentes revisadas disponibles para esta comprobación. Esto no demuestra que la afirmación sea falsa.',
      coverage: 'insufficient',
      claimType: analysisWasTruncated ? 'mixed' : compiledClaim.claimType || 'mixed',
      blocks: [
        { type: 'claim_breakdown', propositionIds: breakdownItems.map((_, index) => `unresolved-proposition-${index + 1}`), items: breakdownItems },
        { type: 'evidence_gap', missing, needed, nextAction },
        { type: 'cannot_conclude', evidenceIds: [], points: ['La ausencia de una medida compatible en las fuentes revisadas no demuestra que la afirmación sea falsa.', ...(compiledClaim.claimType === 'causal' ? ['La coincidencia de dos hechos no demuestra una relación causal.'] : []), ...(analysisWasTruncated ? [`El texto posterior a ${FALLBACK_CLAIM_MAX_CHARS} caracteres no se interpretó.`] : [])] },
      ],
      clarificationQuestion,
      limitation: guidance.limitation,
      researchPlan: {
        claim: original,
        queries: [original, `${original} España datos oficiales`, `${original} estudio evidencia`].map((query) => query.slice(0, 240)),
        dimensions: ['definición del indicador', 'periodo', 'territorio', 'población', 'fuente primaria'],
        evidenceTarget: 'Buscar una fuente primaria o un estudio metodológicamente compatible antes de emitir un veredicto.',
      },
      evidenceIds: [],
      sourceIds: [],
      evidenceSummary: { mode: 'none', families: [], missingDimensions: missing, fallbackReason: 'No se localizó una fuente dinámica ni un snapshot compatible en las fuentes revisadas disponibles para esta comprobación.' },
      knowledgeVersion: RUNTIME_VERSIONS.fallbackKnowledge,
    },
  };
};
