// Official Spanish university graduate outcomes, cohort 2019–2020, released
// by the SIIU on 2026-03-13. The contribution-group shares describe only
// graduates registered as salaried employees in the Social Security system;
// they are not job-to-degree match rates or measures of labour demand.
const source = {
  id: 'siiu-graduate-contribution-groups-2019-2020',
  title: 'Grupos de cotización de los afiliados a la Seguridad Social · egresados de Grado y Ciclo',
  publisher: 'Ministerio de Ciencia, Innovación y Universidades · SIIU',
  url: 'https://estadisticas.ciencia.gob.es/jaxiPx/Tabla.htm?L=0&file=px_afil_grado_grupocot_campo_sexo_tot.px&path=%2FUniversitaria%2FAFIL%2FGRADO_GRUPOCOT%2Fl0%2F',
  publishedAt: '2026-03-13',
  retrievedAt: '2026-11-24',
  schedule: 'annual',
  trust: 'primary',
};

const methodologySource = {
  id: 'siiu-graduate-employment-methodology-2019-2020',
  title: 'Metodología de la Estadística de Inserción Laboral de los Egresados Universitarios',
  publisher: 'Ministerio de Ciencia, Innovación y Universidades · SIIU',
  url: 'https://www.ciencia.gob.es/dam/jcr%3Aa8b03c55-9d37-40da-ab3b-da4d66feb052/Metodologia.pdf',
  retrievedAt: '2026-11-24',
  trust: 'primary',
};

export const UNIVERSITY_GRADUATE_OUTCOMES_SNAPSHOT = Object.freeze({
  expiresAt: '2027-03-13',
  territories: ['ES'],
  evidenceLabel: 'Inserción laboral de graduados universitarios por ámbito de estudio',
  dimensions: {
    subject: 'distribución de los grupos de cotización de graduados universitarios empleados por cuenta ajena',
    population: 'egresados de Grado y Ciclo de la cohorte académica 2019–2020 afiliados por cuenta ajena a la Seguridad Social durante algún día de marzo, cuatro años después de egresar',
    period: 'cohorte 2019–2020; observación cuatro años después de egresar (2024)',
    geography: 'España',
    denominator: 'egresados de la cohorte observados en alta por cuenta ajena en la Seguridad Social durante algún día de marzo; porcentajes distribuidos entre grupos de cotización',
    unit: 'porcentaje de la distribución por grupo de cotización',
  },
  facts: [
    'En España, cohorte universitaria de Grado y Ciclo 2019–2020: cuatro años después, el 61,29 % de afiliados por cuenta ajena a la Seguridad Social al menos un día de marzo estaba en el grupo de cotización universitario.',
  ],
  factSourceIds: [['siiu-graduate-contribution-groups-2019-2020']],
  limitation: 'El grupo de cotización aproxima el nivel laboral, pero no prueba que cada puesto exija la titulación concreta. La distribución solo cubre afiliación asalariada en España; excluye el empleo en el extranjero y parte del ejercicio profesional cubierto por mutualidades. No mide vacantes ni evolución.',
  sources: [source, methodologySource],
});
