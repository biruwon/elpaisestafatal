// INE first-job timing categories for the 2013-14 graduating cohort,
// published in the 2019 ETEFIL and EILU surveys. Percentages use only
// graduates who had held at least one paid job since completing their studies.
// These separate surveys support a narrow historical comparison, not a
// general or causal claim about every vocational or university pathway.
const vocationalSource = {
  id: 'ine-etefil-first-job-2019',
  title: 'Encuesta de transición educativa-formativa e inserción laboral · Año 2019',
  publisher: 'INE',
  url: 'https://www.ine.es/prensa/etefil_2019.pdf',
  retrievedAt: '2026-11-26',
  schedule: 'irregular',
  trust: 'primary',
};

const universitySource = {
  id: 'ine-eilu-first-job-2019',
  title: 'Encuesta de inserción laboral de titulados universitarios · Año 2019',
  publisher: 'INE',
  url: 'https://www.ine.es/prensa/eilu_2019.pdf',
  retrievedAt: '2026-11-26',
  schedule: 'irregular',
  trust: 'primary',
};

const denominator = 'personas tituladas en el curso 2013-14 que declararon haber tenido algún trabajo remunerado desde que terminaron los estudios';
const observation = ({ id, metricId, metric, value, pathway, category, source }) => ({
  id,
  kind: 'observation',
  dataKind: 'snapshot',
  metricId,
  metric,
  value,
  unit: 'Percentage',
  period: '2019',
  geography: 'España',
  population: denominator,
  denominator,
  dimensions: {
    geo: 'ES',
    unit: 'PC',
    cohort: '2013-14',
    surveyYear: '2019',
    educationPath: pathway,
    category,
  },
  dimensionLabels: { geo: 'Spain', cohort: '2013-14', surveyYear: '2019' },
  freshness: 'fresh',
  source,
});

export const EDUCATION_FIRST_JOB_SNAPSHOT = Object.freeze({
  schemaVersion: '1',
  owner: 'knowledge-review',
  createdAt: '2026-11-26',
  expiresAt: '2027-11-30',
  refreshCommand: 'npm run knowledge:refresh',
  validationStatus: 'reviewed',
  asOf: '2026-11-26',
  supportedScope: 'España; titulados de Ciclos Formativos de Grado Superior y graduados universitarios del curso 2013-14; INE survey results published in 2019; time-to-first-job categories among those who had held paid work since graduation',
  unsupportedScope: 'all vocational pathways, individual guarantee, mean time-to-first-job, causality, recent cohorts, other periods or territories, age-specific comparisons',
  observations: [
    observation({
      id: 'ine-etefil-cfgs-first-job-under-three-months-2019',
      metricId: 'first_job_under_three_months_vocational_graduates',
      metric: 'Titulados de CFGS cuyo primer empleo llegó en menos de tres meses',
      value: 26.7,
      pathway: 'CFGS',
      category: 'first_job_under_3_months',
      source: vocationalSource,
    }),
    observation({
      id: 'ine-etefil-cfgs-continued-study-job-six-months-2019',
      metricId: 'continued_study_job_six_months_vocational_graduates',
      metric: 'Titulados de CFGS que trabajaban mientras estudiaban y siguieron en ese empleo al menos seis meses',
      value: 23.4,
      pathway: 'CFGS',
      category: 'working_during_studies_continued_6_months',
      source: vocationalSource,
    }),
    observation({
      id: 'ine-eilu-university-first-job-under-three-months-2019',
      metricId: 'first_job_under_three_months_university_graduates',
      metric: 'Graduados universitarios cuyo primer empleo llegó en menos de tres meses',
      value: 22.9,
      pathway: 'university',
      category: 'first_job_under_3_months',
      source: universitySource,
    }),
    observation({
      id: 'ine-eilu-university-continued-study-job-six-months-2019',
      metricId: 'continued_study_job_six_months_university_graduates',
      metric: 'Graduados universitarios que trabajaban mientras estudiaban y siguieron en ese empleo al menos seis meses',
      value: 28.1,
      pathway: 'university',
      category: 'working_during_studies_continued_6_months',
      source: universitySource,
    }),
  ],
});
