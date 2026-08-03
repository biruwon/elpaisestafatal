const normalise = (value) => String(value || '')
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ñ/g, 'n')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const metricHints = [
  { ids: ['household_electricity_price'], terms: ['precio de la luz', 'factura de la luz', 'precio de la electricidad', 'coste de la electricidad', 'tarifa electrica', 'electricidad', 'electricidad para las familias', 'luz mas cara'] },
  { ids: ['rental_price_index'], terms: ['precio del alquiler', 'precios del alquiler', 'alquiler', 'alquileres', 'rentas de alquiler', 'alquiler mas caro', 'sube el alquiler'] },
  { ids: ['harmonised_price_index'], terms: ['comparable con europa', 'metodologia europea', 'indice armonizado', 'hicp', 'inflacion comparable'] },
  { ids: ['inflation_rate'], terms: ['inflacion', 'tasa de inflacion', 'inflacion anual', 'subida de precios', 'ritmo de los precios', 'ritmo suben precios', 'ritmo suben los precios', 'tasa anual de los precios', 'precios aumentan'] },
  { ids: ['inflation_rate_europe'], terms: ['inflacion de espana frente a europa', 'inflacion de espana por encima de europa', 'inflacion de espana por encima de la union europea', 'tasa de inflacion espanola es menor que la europea', 'tasa de inflacion espanola menor que la europea', 'inflacion frente a europa', 'inflacion frente a la union europea', 'inflacion espanola mas alta que europa', 'inflacion espanola mas alta que la union europea', 'inflacion espanola menor que europea', 'inflacion mas alta que europa', 'inflacion mas baja que europa', 'precios suben mas que europa', 'comparacion de la inflacion espanola', 'comparacion inflacion espanola union europea', 'inflacion comparable con europa', 'inflacion comparable europa'] },
  { ids: ['gdp_current_prices'], terms: ['pib nominal', 'pib a precios corrientes', 'tamano de la economia', 'valor del pib', 'producto interior bruto en euros', 'produccion economica nacional'] },
  { ids: ['gdp_per_capita_current_prices'], terms: ['pib por habitante', 'pib per capita', 'producto interior bruto por persona', 'economia por habitante', 'pib por persona'] },
  { ids: ['gdp_per_capita_europe'], terms: ['pib por habitante frente a europa', 'pib por habitante frente a la union europea', 'pib per capita frente a europa', 'pib per capita frente a la union europea', 'como queda el pib por habitante', 'pib por habitante espanol comparado', 'comparacion del pib per capita', 'espana tiene mas pib por habitante que europa', 'espana tiene menos pib por habitante que europa', 'espana tiene mas pib por habitante que la union europea', 'espana tiene menos pib por habitante que la union europea', 'tiene espana mas pib por habitante que europa', 'tiene espana menos pib por habitante que europa', 'tiene espana mas pib por habitante que la union europea', 'tiene espana menos pib por habitante que la union europea', 'pib por habitante que la union europea', 'pib por persona frente a europa', 'pib por persona frente a la union europea', 'pib por persona que europa', 'pib por persona que la union europea', 'pib europa por habitante', 'pib europa por persona'] },
  { ids: ['gdp_real_growth_quarterly'], terms: ['actividad economica', 'actividad economica cae', 'actividad economica esta cayendo', 'economia cae', 'crecimiento negativo', 'recesion', 'pib real', 'crecimiento del pib', 'crecimiento interanual pib', 'crece el pib'] },
  { ids: ['gdp_real_growth_europe'], terms: ['pib real frente a europa', 'crecimiento del pib frente a europa', 'pib real espanol crece mas', 'comparacion del crecimiento economico', 'crece espana mas que europa', 'crece espana mas que la union europea', 'espana crece mas que europa', 'espana crece mas que la union europea', 'crece espana menos que europa', 'crece espana menos que la union europea', 'espana crece menos que europa', 'espana crece menos que la union europea', 'crecimiento de espana frente a la union europea', 'crecimiento economico europeo', 'pib espana union europea', 'pib frente a europa', 'crecimiento frente a europa'] },
  { ids: ['employment_rate'], terms: ['tasa de empleo', 'tasa de ocupacion', 'personas ocupadas', 'personas que tienen empleo', 'personas en edad laboral trabajan', 'encuentra trabajo', 'tiene empleo', 'ocupacion en espana', 'empleo en espana', 'mas empleo', 'empleo nunca', 'empleo record'] },
  { ids: ['employment_rate_europe'], terms: ['tasa de empleo frente a europa', 'tasa de empleo frente a la union europea', 'tasa de empleo mayor que europa', 'tasa de empleo mayor que la union europea', 'tasa de empleo menor que europa', 'tasa de empleo menor que la union europea', 'tasa de empleo de espana es inferior a la de europa', 'tasa de empleo de espana inferior a europa', 'como queda el empleo espanol frente al europeo', 'tasa de ocupacion de espana frente a la union europea', 'empleo de espana frente a europa', 'empleo de espana frente a la union europea', 'espana tiene mas empleo que europa', 'espana tiene menos empleo que europa', 'espana tiene una tasa de empleo mayor que la union europea', 'espana tiene una tasa de empleo menor que la union europea', 'comparacion europea del empleo', 'comparacion europea de la ocupacion', 'empleo mas alto que europa', 'empleo mas bajo que europa', 'empleo europa'] },
  { ids: ['part_time_employment_rate'], terms: ['empleo a tiempo parcial', 'trabajo a tiempo parcial', 'tiempo parcial', 'empleo parcial', 'jornada parcial', 'contratos parciales', 'trabajos a tiempo parcial', 'empleos a tiempo parcial', 'cuanto empleo es parcial', 'cuanto trabajo es parcial'] },
  { ids: ['part_time_employment_rate_europe'], terms: ['empleo a tiempo parcial frente a europa', 'empleo a tiempo parcial frente a la union europea', 'trabajo a tiempo parcial frente a europa', 'tiempo parcial frente a europa', 'empleo parcial que europa', 'empleo parcial que la union europea', 'espana tiene mas empleo parcial que europa', 'espana tiene menos empleo parcial que europa', 'comparacion europea del empleo parcial', 'empleo parcial europa'] },
  { ids: ['temporary_employment_rate'], terms: ['empleo temporal', 'trabajo temporal', 'contratos temporales', 'contrato temporal', 'temporalidad laboral', 'empleo de duracion determinada', 'trabajo de duracion determinada', 'cuanto empleo es temporal', 'parte del empleo temporal', 'es temporal', 'temporalidad'] },
  { ids: ['temporary_employment_rate_europe'], terms: ['empleo temporal frente a europa', 'empleo temporal frente a la union europea', 'trabajo temporal frente a europa', 'temporalidad frente a europa', 'temporalidad que europa', 'espana tiene mas temporalidad que europa', 'espana tiene menos temporalidad que europa', 'comparacion europea de la temporalidad', 'temporalidad europa'] },
  { ids: ['median_hourly_earnings'], terms: ['salario mediano por hora', 'salario bruto por hora', 'ganancia mediana por hora', 'sueldo por hora', 'lo que se cobra por hora', 'cuanto se cobra por hora', 'salario por hora'] },
  { ids: ['median_hourly_earnings_europe'], terms: ['salario por hora frente a europa', 'salario por hora frente a la union europea', 'sueldo por hora frente a europa', 'sueldo por hora frente a la ue', 'espana cobra mas por hora que europa', 'espana cobra menos por hora que europa', 'comparacion europea del salario por hora', 'comparacion europea del salario bruto por hora', 'salario por hora europa'] },
  { ids: ['minimum_wage_monthly'], terms: ['salario minimo', 'salario minimo interprofesional', 'smi', 'sueldo minimo', 'minimo salarial', 'cuanto es el salario minimo', 'ha subido el salario minimo', 'sube el salario minimo', 'salario minimo en espana'] },
  { ids: ['social_protection_benefits_per_capita'], terms: ['gasto en proteccion social', 'prestaciones de proteccion social', 'proteccion social por habitante', 'prestaciones por habitante', 'gasto en prestaciones sociales', 'prestaciones sociales', 'ayudas sociales', 'gasto en ayudas', 'gasto social', 'prestaciones publicas', 'cuanto se gasta en ayudas', 'cuanto gasta espana en proteccion social'] },
  { ids: ['old_age_survivors_benefits_per_capita'], terms: ['gasto en pensiones', 'prestaciones de vejez', 'pensiones por habitante', 'gasto en jubilacion', 'pensiones y supervivencia', 'cuanto gasta espana en pensiones', 'cuanto se gasta en pensiones', 'gasto de las pensiones', 'gasto pensionistas'] },
  { ids: ['old_age_survivors_benefits_per_capita_europe'], terms: ['gasto en pensiones frente a europa', 'gasto en pensiones por habitante frente a europa', 'como queda el gasto en pensiones espanol frente a europa', 'gasto espanol en pensiones por persona comparado con europa', 'pensiones de espana frente a europa', 'pensiones por habitante frente a europa', 'espana gasta mas en pensiones que europa', 'espana gasta menos en pensiones que europa', 'espana gasta mas por habitante en pensiones que la union europea', 'espana gasta menos por habitante en pensiones que la union europea', 'pensiones por habitante que europa', 'pensiones frente a la union europea', 'pensiones y supervivencia frente a la union europea', 'comparacion europea del gasto en pensiones'] },
  { ids: ['unemployment_rate'], terms: ['tasa de paro', 'tasa de desempleo', 'desempleo en espana', 'paro en espana', 'evolucion del desempleo', 'evolucion del paro', 'no encuentra trabajo', 'no encuentran trabajo', 'personas activas no encuentran trabajo'] },
  { ids: ['unemployment_rate_europe'], terms: ['paro en europa', 'desempleo en europa', 'desempleo espanol frente al europeo', 'tasa de paro de espana frente a los paises europeos', 'tasa de paro espana frente a los paises europeos', 'ranking europeo de la tasa de desempleo', 'tasa de paro europea', 'comparacion europea', 'comparar paro europa', 'frente a europa en desempleo', 'paro mas alto de europa', 'paro mas bajo de europa', 'puesto de espana por desempleo', 'tasa paro europa', 'espana tasa paro alta europa', 'espana tasa paro baja europa', 'espana tasa de paro alta en europa', 'espana tasa de paro baja en europa', 'paro alta europa', 'paro baja europa'] },
  { ids: ['youth_unemployment_rate_europe'], terms: ['paro juvenil frente a europa', 'desempleo juvenil frente a europa', 'paro juvenil de espana frente a europa', 'paro juvenil de espana frente a la union europea', 'tasa de paro juvenil frente a europa', 'tasa de paro juvenil frente a la union europea', 'espana tiene mas paro juvenil que europa', 'espana tiene mas paro juvenil que la union europea', 'espana tiene menos paro juvenil que europa', 'espana tiene menos paro juvenil que la union europea', 'desempleo juvenil europeo', 'comparacion europea del paro juvenil', 'paro juvenil europa'] },
  { ids: ['early_school_leaving_rate_europe'], terms: ['abandono escolar frente a europa', 'abandono escolar frente a la union europea', 'abandono escolar temprano frente a europa', 'abandono escolar temprano frente a la union europea', 'abandono educativo frente a europa', 'abandono educativo frente a la union europea', 'espana tiene mas abandono escolar que europa', 'espana tiene mas abandono escolar que la union europea', 'espana tiene menos abandono escolar que europa', 'espana tiene menos abandono escolar que la union europea', 'comparacion europea del abandono escolar', 'abandono escolar europa'] },
  { ids: ['early_school_leaving_rate'], terms: ['abandono escolar temprano', 'abandono escolar', 'abandono educativo', 'proporcion de jovenes que dejan la educacion temprano', 'proporcion de jovenes dejan la educacion temprano', 'jovenes dejan educacion temprano', 'dejan los estudios', 'dejan los estudios antes de tiempo', 'jovenes que abandonan los estudios', 'fracaso escolar temprano'] },
  { ids: ['tertiary_education_attainment_rate'], terms: ['estudios superiores', 'educacion superior', 'titulacion superior', 'universitarios', 'graduados', 'titulados', 'universitarios de 25 a 34', 'jovenes con estudios universitarios', 'personas con estudios superiores'] },
  { ids: ['neet_rate_europe'], terms: ['ninis frente a europa', 'ninis frente a la union europea', 'ni estudian ni trabajan frente a europa', 'ni estudian ni trabajan frente a la union europea', 'espana tiene mas ninis que europa', 'espana tiene mas ninis que la union europea', 'espana tiene menos ninis que europa', 'espana tiene menos ninis que la union europea', 'tiene espana mas ninis que europa', 'tiene espana mas ninis que la union europea', 'comparacion europea de ninis', 'ninis europa'] },
  { ids: ['neet_rate'], terms: ['ni estudian ni trabajan', 'ni estudia ni trabaja', 'ninis', 'jovenes ninis', 'fuera del empleo y de la educacion', 'fuera de estudio y empleo', 'no estudian ni trabajan'] },
  { ids: ['youth_unemployment_rate'], terms: ['joven', 'juvenil', 'jovenes', 'youth', '15-24'] },
  { ids: ['government_debt_ratio'], terms: ['deuda', 'endeudamiento', 'debt', 'cuanto debe españa', 'deuda del pais', 'nivel de deuda española'] },
  { ids: ['government_debt_current_prices'], terms: ['deuda publica en euros', 'deuda publica total', 'importe total de la deuda publica', 'importe de la deuda publica', 'importe en millones de euros de la deuda publica', 'deuda publica española expresada en euros', 'deuda publica expresada en euros', 'cuanto dinero debe el sector publico', 'cuanto dinero debe españa', 'cuanto debe españa en euros', 'cuanto debe españa en dinero', 'deuda de españa en euros', 'deuda publica en millones', 'deuda nominal', 'billones de deuda'] },
  { ids: ['government_revenue_ratio'], terms: ['recaudacion', 'recaudación', 'ingresos publicos', 'ingresos públicos', 'ingresos del estado'] },
  { ids: ['government_expenditure_ratio'], terms: ['gasto publico', 'gasto público', 'gasto del estado', 'presupuesto publico', 'presupuesto público'] },
  { ids: ['government_revenue_ratio_europe'], terms: ['ingresos publicos frente a europa', 'ingresos publicos frente a la union europea', 'como quedan los ingresos publicos espanoles frente a europa', 'ingresos publicos de espana comparados con europa', 'comparacion europea de los ingresos publicos', 'recaudacion publica frente a europa', 'recaudacion publica frente a la union europea', 'espana recauda mas que europa', 'espana recauda menos que europa', 'espana recauda mas que la union europea', 'espana recauda menos que la union europea', 'recauda mas o menos que la media europea', 'recauda mas o menos que la media de la union europea', 'ingresos publicos europa', 'recaudacion europa'] },
  { ids: ['government_current_taxes_income_wealth_europe'], terms: ['impuestos sobre la renta y la riqueza frente a europa', 'impuestos sobre la renta frente a europa', 'impuestos de espana frente a europa', 'impuestos frente a europa', 'impuestos sobre renta y riqueza que la union europea', 'espana cobra mas impuestos sobre renta y riqueza que la union europea', 'espana cobra menos impuestos sobre renta y riqueza que la union europea', 'presion fiscal frente a europa', 'presion fiscal frente a la union europea', 'espana cobra mas impuestos que europa', 'espana cobra menos impuestos que europa', 'espana cobra mas impuestos que la union europea', 'espana cobra menos impuestos que la union europea', 'espana es el pais que mas impuestos cobra de europa', 'impuestos mas altos de europa', 'impuestos mas bajos de europa', 'cuantos impuestos cobra espana frente a europa', 'espana tiene demasiados impuestos', 'espana cobra demasiados impuestos', 'presion fiscal alta en espana', 'impuestos altos en espana', 'infierno fiscal'] },
  { ids: ['government_expenditure_ratio_europe'], terms: ['gasto publico frente a europa', 'gasto publico frente a la union europea', 'como queda el gasto publico espanol frente a europa', 'comparacion europea del gasto publico', 'gasto publico espanol frente al de la union europea', 'gasto del estado frente a europa', 'gasto del estado frente a la union europea', 'espana gasta mas que europa', 'espana gasta menos que europa', 'espana gasta mas que la union europea', 'espana gasta menos que la union europea', 'gasta mas o menos que la media europea', 'gasta mas o menos que la media de la union europea', 'gasto publico europa', 'gasto europa'] },
  { ids: ['housing_cost_overburden_rate'], terms: ['sobrecarga', 'coste de la vivienda', 'gastos de vivienda', 'esfuerzo de vivienda', 'sobrecarga coste vivienda', 'hogares soportan el coste de la vivienda', 'porcentaje de hogares soporta'] },
  { ids: ['housing_cost_overburden_rate_europe'], terms: ['sobrecarga de vivienda frente a europa', 'sobrecarga de vivienda frente a la union europea', 'esfuerzo de vivienda frente a europa', 'esfuerzo de vivienda frente a la union europea', 'espana tiene mas sobrecarga de vivienda que europa', 'espana tiene menos sobrecarga de vivienda que europa', 'comparacion europea del esfuerzo de vivienda', 'sobrecarga vivienda europa'] },
  { ids: ['health_expenditure_per_capita'], terms: ['gasto sanitario', 'gasto en sanidad', 'gasto en salud', 'recursos sanitarios', 'gasto sanitario por habitante', 'gasto sanitario por persona', 'gasto por habitante en sanidad', 'gasta en sanidad por habitante', 'gasta sanidad por habitante', 'gasta sanidad habitante', 'cuanto gasta sanidad habitante', 'sanidad por habitante', 'gasto por persona en sanidad', 'dinero por persona en sanidad', 'cuanto dinero se dedica a sanidad', 'cuanto dinero se dedica por persona a la sanidad', 'cuanto se gasta en sanidad', 'cuanto se gasta en salud'] },
  { ids: ['health_expenditure_per_capita_europe'], terms: ['gasto sanitario frente a europa', 'gasto sanitario frente a la union europea', 'como se compara el gasto sanitario de espana con europa', 'comparacion europea del gasto de salud por habitante', 'gasto en sanidad frente a europa', 'gasto en sanidad frente a la union europea', 'espana gasta mas en sanidad que europa', 'espana gasta menos en sanidad que europa', 'espana gasta mas en sanidad que la union europea', 'espana gasta menos en sanidad que la union europea', 'espana gasta mas por habitante en sanidad', 'espana gasta menos por habitante en sanidad', 'gasto sanitario europa', 'sanidad europa'] },
  { ids: ['unmet_healthcare_waiting_list_rate'], terms: ['lista de espera medica', 'lista de espera sanitaria', 'no recibe atencion por lista de espera', 'personas sin atencion por lista de espera', 'espera medica impide atencion', 'necesidad medica no atendida por espera'] },
  { ids: ['life_expectancy_at_birth'], terms: ['esperanza de vida', 'esperanza vida', 'esperanza de vida al nacer', 'años de vida', 'vida media', 'cuantos años vive', 'cuanto vive', 'longevidad', 'evolucionado esperanza vida'] },
  { ids: ['fertility_rate'], terms: ['fecundidad', 'tasa de fecundidad', 'natalidad', 'tasa de natalidad', 'hijos por mujer', 'nacimientos por mujer'] },
  { ids: ['old_age_dependency_ratio'], terms: ['envejecimiento', 'envejecida', 'personas mayores', 'dependencia de mayores', 'mayores de 65', 'sociedad envejecida'] },
  { ids: ['older_population_share'], terms: ['poblacion de 65 anos o mas', 'porcentaje de personas mayores', 'personas de mas de 65', 'proporcion de mayores', 'poblacion mayor'] },
  { ids: ['young_population_share'], terms: ['poblacion de 0 a 14 anos', 'menores de 15', 'poblacion infantil', 'porcentaje de ninos', 'proporcion de menores', 'poblacion menos anos', 'porcentaje poblacion menos anos', 'menos de quince anos'] },
  { ids: ['population_change_rate'], terms: ['crecimiento demografico', 'crecimiento poblacional', 'esta creciendo o bajando la poblacion', 'cambio anual de habitantes', 'tasa de variacion demografica', 'variacion de poblacion', 'variacion demografica', 'crecimiento de la poblacion', 'crece la poblacion', 'esta creciendo', 'la poblacion esta creciendo', 'poblacion creciendo', 'pierde poblacion', 'perdiendo poblacion', 'espana esta perdiendo poblacion', 'despoblacion', 'cambio demografico', 'cambio poblacional'] },
  { ids: ['resident_population'], terms: ['poblacion residente', 'residentes en espana', 'habitantes de espana', 'habitantes viven en espana', 'habitantes viven normalmente en espana', 'habitantes viven normalmente espana', 'cuantos habitantes viven normalmente espana', 'millones de habitantes', 'millones habitantes', 'espana millones habitantes', 'cuantos habitantes hay', 'numero de habitantes'] },
  { ids: ['regional_population_density'], terms: ['densidad de poblacion', 'densidad poblacion', 'densidad demografica', 'habitantes por kilometro cuadrado', 'personas por kilometro cuadrado', 'personas por km2', 'personas por km²', 'densidad de las comunidades', 'densidad regional', 'comunidades mas densas', 'region mas densa'] },
  { ids: ['foreign_born_population'], terms: ['nacidos fuera de espana', 'nacidos en el extranjero', 'ha aumentado el numero de residentes nacidos fuera', 'residentes españoles clasificados por pais de nacimiento', 'residentes por pais de nacimiento', 'poblacion nacida fuera', 'personas nacidas fuera', 'residentes nacieron fuera', 'poblacion inmigrante por pais de nacimiento', 'poblacion inmigrante segun su pais de nacimiento', 'inmigrantes segun pais de nacimiento'] },
  { ids: ['foreign_citizenship_population'], terms: ['poblacion extranjera', 'poblacion con nacionalidad extranjera', 'personas con nacionalidad extranjera', 'ciudadania extranjera', 'nacionalidad extranjera', 'extranjeros por nacionalidad', 'residentes extranjeros por nacionalidad', 'cuantos extranjeros viven en espana'] },
  { ids: ['immigration_flows'], terms: ['llegadas de inmigrantes', 'personas inmigraron', 'flujos migratorios', 'entradas de inmigrantes', 'inmigracion anual'] },
  // This source is category-level. Keep the route explicit: generic
  // “inseguridad” and immigration-causality wording must not silently attach
  // one arbitrary offence category to the user's claim.
  { ids: ['recorded_offences'], terms: ['criminalidad registrada', 'delincuencia registrada', 'delitos registrados', 'delitos registra', 'infracciones penales conocidas', 'evolucion de la criminalidad', 'evolucion de la delincuencia', 'criminalidad aumenta', 'criminalidad sube', 'criminalidad baja', 'criminalidad disminuye', 'homicidios registrados', 'asesinatos registrados', 'robos registrados', 'hurtos registrados', 'fraudes registrados', 'estafas registradas', 'agresiones sexuales registradas', 'violencia sexual registrada', 'corrupcion registrada'] },
  { ids: ['gini_coefficient'], terms: ['gini', 'desigualdad de ingresos', 'como se reparte la renta entre los hogares', 'medida de desigualdad de ingresos', 'desigualdad', 'distribucion de la renta'] },
  { ids: ['government_deficit_ratio'], terms: ['deficit publico', 'deficit del estado', 'superavit publico', 'deficit sobre pib'] },
  { ids: ['median_equivalised_income'], terms: ['renta mediana', 'ingresos medianos', 'renta disponible', 'ingresos de los hogares', 'renta de las familias', 'ingresos medianos de las familias', 'cuanto ingresan los hogares', 'cuanto ingresan de media los hogares'] },
  { ids: ['median_equivalised_income_europe'], terms: ['renta mediana frente a europa', 'renta mediana frente a la union europea', 'como queda la renta mediana de espana frente a europa', 'hogares españoles tienen menos renta mediana que la ue', 'comparacion europea de los ingresos medianos', 'ingresos de los hogares frente a europa', 'ingresos de los hogares frente a la union europea', 'espana tiene mas renta que europa', 'espana tiene menos renta que europa', 'espana tiene mas renta mediana que europa', 'espana tiene menos renta mediana que europa', 'espana tiene mas renta que la union europea', 'espana tiene menos renta que la union europea', 'espana tiene mas renta mediana que la union europea', 'espana tiene menos renta mediana que la union europea', 'ingresos medianos frente a europa', 'ingresos medianos frente a la union europea', 'ingresos medianos que europa', 'ingresos medianos que la union europea', 'renta de espana frente a europa', 'renta europa'] },
  { ids: ['arope_rate_europe'], terms: ['arope frente a europa', 'arope frente a la union europea', 'riesgo de pobreza frente a europa', 'riesgo de pobreza frente a la union europea', 'riesgo de pobreza o exclusion que la union europea', 'pobreza o exclusion frente a europa', 'pobreza o exclusion frente a la union europea', 'espana tiene mas riesgo de pobreza que europa', 'espana tiene mas riesgo de pobreza que la union europea', 'espana tiene menos riesgo de pobreza que europa', 'espana tiene menos riesgo de pobreza que la union europea', 'comparacion europea de arope', 'arope europa'] },
  { ids: ['arope_rate'], terms: ['arope', 'riesgo de pobreza o exclusion', 'riesgo de pobreza y exclusion', 'pobreza o exclusion social', 'porcentaje en riesgo de pobreza', 'personas en riesgo de pobreza', 'porcentaje residentes arope', 'residentes arope'] },
  { ids: ['cpi_index'], terms: ['coste de vida', 'cesta de la compra', 'precios de consumo'] },
  { ids: ['house_price_index'], terms: ['casas mas caras', 'casas son mas caras', 'casas mucho mas caras', 'casas son mucho mas caras', 'precio de las casas', 'precios de las casas', 'precio vivienda', 'precios vivienda', 'vivienda precio', 'vivienda precios', 'precio vivienda espana', 'comprar una casa', 'precio de comprar una casa', 'comprar vivienda'] },
];

export const preferredMetricIdsForQuery = (query) => {
  const normalized = normalise(query);
  const preferred = new Set(metricHints
    .filter((hint) => hint.terms.some((term) => normalized.includes(normalise(term))))
    .flatMap((hint) => hint.ids));
  // “Inflation” can mean either the annual rate or the harmonised index.
  // When the user explicitly asks for European comparability, the index is
  // the intended family and must win over the generic inflation hint.
  if (preferred.has('harmonised_price_index')) {
    preferred.delete('inflation_rate');
    preferred.delete('cpi_index');
  }
  if (preferred.has('unemployment_rate_europe')) preferred.delete('unemployment_rate');
  if (preferred.has('unemployment_rate') && /\b(?:paro|desempleo|no encuentra|no encuentran)\b/.test(normalized)) preferred.delete('employment_rate');
  if (preferred.has('inflation_rate_europe')) {
    preferred.delete('inflation_rate');
    preferred.delete('harmonised_price_index');
  }
  if (preferred.has('employment_rate_europe')) {
    preferred.delete('employment_rate');
    preferred.delete('unemployment_rate_europe');
  }
  if (preferred.has('part_time_employment_rate_europe')) {
    preferred.delete('part_time_employment_rate');
    preferred.delete('employment_rate');
    preferred.delete('employment_rate_europe');
    preferred.delete('unemployment_rate');
    preferred.delete('unemployment_rate_europe');
  }
  if (preferred.has('part_time_employment_rate')) {
    preferred.delete('employment_rate');
    preferred.delete('employment_rate_europe');
    preferred.delete('unemployment_rate');
    preferred.delete('unemployment_rate_europe');
  }
  if (preferred.has('temporary_employment_rate_europe')) {
    preferred.delete('temporary_employment_rate');
    preferred.delete('employment_rate');
    preferred.delete('employment_rate_europe');
    preferred.delete('unemployment_rate');
    preferred.delete('unemployment_rate_europe');
  }
  if (preferred.has('temporary_employment_rate')) {
    preferred.delete('employment_rate');
    preferred.delete('employment_rate_europe');
    preferred.delete('unemployment_rate');
    preferred.delete('unemployment_rate_europe');
  }
  if (preferred.has('median_hourly_earnings_europe')) {
    preferred.delete('median_hourly_earnings');
    preferred.delete('employment_rate_europe');
    preferred.delete('unemployment_rate_europe');
  }
  if (preferred.has('median_hourly_earnings')) {
    preferred.delete('employment_rate');
    preferred.delete('unemployment_rate');
  }
  if (preferred.has('housing_cost_overburden_rate_europe')) {
    preferred.delete('housing_cost_overburden_rate');
  }
  if (preferred.has('youth_unemployment_rate_europe')) {
    preferred.delete('youth_unemployment_rate');
    preferred.delete('unemployment_rate_europe');
    preferred.delete('unemployment_rate');
    preferred.delete('employment_rate_europe');
    preferred.delete('employment_rate');
  }
  if (preferred.has('early_school_leaving_rate_europe')) {
    preferred.delete('early_school_leaving_rate');
    preferred.delete('youth_unemployment_rate');
    preferred.delete('tertiary_education_attainment_rate');
    preferred.delete('neet_rate');
    preferred.delete('neet_rate_europe');
  }
  if (preferred.has('neet_rate_europe')) {
    preferred.delete('neet_rate');
    preferred.delete('early_school_leaving_rate');
    preferred.delete('early_school_leaving_rate_europe');
    preferred.delete('youth_unemployment_rate');
    preferred.delete('youth_unemployment_rate_europe');
  }
  if (preferred.has('arope_rate_europe')) preferred.delete('arope_rate');
  if (preferred.has('government_revenue_ratio_europe')) preferred.delete('government_revenue_ratio');
  if (preferred.has('government_current_taxes_income_wealth_europe')) {
    preferred.delete('government_revenue_ratio');
    preferred.delete('government_revenue_ratio_europe');
    preferred.delete('government_expenditure_ratio');
    preferred.delete('government_expenditure_ratio_europe');
    preferred.delete('median_equivalised_income_europe');
  }
  if (preferred.has('government_expenditure_ratio_europe')) preferred.delete('government_expenditure_ratio');
  if (preferred.has('health_expenditure_per_capita_europe')) preferred.delete('health_expenditure_per_capita');
  if (preferred.has('government_debt_current_prices')) preferred.delete('government_debt_ratio');
  if (preferred.has('median_equivalised_income_europe')) preferred.delete('median_equivalised_income');
  if (preferred.has('youth_unemployment_rate')) preferred.delete('unemployment_rate');
  if (preferred.has('youth_unemployment_rate')) preferred.delete('employment_rate');
  if (preferred.has('older_population_share') && /\b(?:porcentaje|proporcion|65 anos|65 o mas)\b/.test(normalized)) preferred.delete('old_age_dependency_ratio');
  if (preferred.has('early_school_leaving_rate') || preferred.has('tertiary_education_attainment_rate')) preferred.delete('youth_unemployment_rate');
  if (preferred.has('unmet_healthcare_waiting_list_rate')) preferred.delete('health_expenditure_per_capita');
  if (preferred.has('gdp_per_capita_current_prices')) preferred.delete('gdp_current_prices');
  if (preferred.has('gdp_per_capita_europe')) {
    preferred.delete('gdp_per_capita_current_prices');
    preferred.delete('gdp_current_prices');
  }
  if (preferred.has('minimum_wage_monthly')) {
    preferred.delete('median_equivalised_income');
    preferred.delete('employment_rate');
    preferred.delete('unemployment_rate');
  }
  if (preferred.has('foreign_citizenship_population')) {
    preferred.delete('foreign_born_population');
    preferred.delete('immigration_flows');
    preferred.delete('resident_population');
  }
  if (preferred.has('foreign_born_population')) {
    preferred.delete('resident_population');
    preferred.delete('immigration_flows');
  }
  if (preferred.has('social_protection_benefits_per_capita')) {
    preferred.delete('government_expenditure_ratio');
    preferred.delete('health_expenditure_per_capita');
    preferred.delete('median_equivalised_income');
  }
  if (preferred.has('old_age_survivors_benefits_per_capita')) {
    preferred.delete('social_protection_benefits_per_capita');
    preferred.delete('government_expenditure_ratio');
    preferred.delete('health_expenditure_per_capita');
    preferred.delete('median_equivalised_income');
  }
  if (preferred.has('old_age_survivors_benefits_per_capita_europe')) {
    preferred.delete('old_age_survivors_benefits_per_capita');
    preferred.delete('social_protection_benefits_per_capita');
    preferred.delete('government_expenditure_ratio');
    preferred.delete('health_expenditure_per_capita');
    preferred.delete('median_equivalised_income');
  }
  if (preferred.has('government_debt_current_prices')) preferred.delete('government_debt_ratio');
  if (preferred.has('gdp_real_growth_europe')) preferred.delete('gdp_real_growth_quarterly');
  if (preferred.has('inflation_rate_europe')) {
    preferred.delete('inflation_rate');
    preferred.delete('cpi_index');
    preferred.delete('harmonised_price_index');
  }
  return preferred;
};

export const excludedMetricIdsForQuery = (query) => {
  const normalized = normalise(query);
  const youthRequested = ['paro juvenil', 'desempleo juvenil', 'jovenes sin trabajo', 'jovenes activos', '15-24'].some((term) => normalized.includes(normalise(term)));
  const earlyEducationRequested = metricHints.find((hint) => hint.ids.includes('early_school_leaving_rate'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const earlyEducationEuropeRequested = metricHints.find((hint) => hint.ids.includes('early_school_leaving_rate_europe'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const tertiaryEducationRequested = metricHints.find((hint) => hint.ids.includes('tertiary_education_attainment_rate'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const neetRequested = metricHints.find((hint) => hint.ids.includes('neet_rate'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const neetEuropeRequested = metricHints.find((hint) => hint.ids.includes('neet_rate_europe'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const aropeRequested = metricHints.find((hint) => hint.ids.includes('arope_rate'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const aropeEuropeRequested = metricHints.find((hint) => hint.ids.includes('arope_rate_europe'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const educationContext = ['educacion', 'educativo', 'estudios', 'escolar', 'universitari', 'titulacion', 'formacion'].some((term) => normalized.includes(term));
  const genericUnemployment = ['paro', 'desemple', 'unemployment', 'encuentra trabajo', 'sin trabajo', 'no trabaja'].some((term) => normalized.includes(term));
  const employmentEuropeRequested = metricHints.find((hint) => hint.ids.includes('employment_rate_europe'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const healthSpendRequested = metricHints.find((hint) => hint.ids.includes('health_expenditure_per_capita'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const healthSpendEuropeRequested = metricHints.find((hint) => hint.ids.includes('health_expenditure_per_capita_europe'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const unmetWaitingListRequested = metricHints.find((hint) => hint.ids.includes('unmet_healthcare_waiting_list_rate'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const vagueHealthOutcome = ['colaps', 'lista de espera', 'espera sanitaria', 'acceso a la sanidad', 'calidad de la sanidad', 'personal sanitario'].some((term) => normalized.includes(term));
  const populationChangeRequested = metricHints.find((hint) => hint.ids.includes('population_change_rate'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const inflationRequested = metricHints.find((hint) => hint.ids.includes('inflation_rate'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const recordedOffencesRequested = metricHints.find((hint) => hint.ids.includes('recorded_offences'))?.terms.some((term) => normalized.includes(normalise(term))) || false;
  const crimeContext = ['insegur', 'delinc', 'criminal', 'crimen', 'delito', 'seguridad', 'homicid', 'asesinat', 'robo', 'fraude', 'corrup'].some((term) => normalized.includes(term));
  const localOrCausalCrime = ['inseguridad', 'inseguro', 'insegura', 'barrio', 'municipio', 'zona', 'inmigr', 'nacionalidad', 'caus', 'crea', 'provoc', 'culpa'].some((term) => normalized.includes(term));
  const demographicContext = ['poblacion', 'demograf', 'inmigr', 'migracion', 'despobl', 'habitantes', 'natalidad', 'fecundidad', 'envejec'].some((term) => normalized.includes(term));
  const broadSubjectivePoliticalClaim = ['destruy', 'hundiendo', 'arruinando', 'fatal'].some((term) => normalized.includes(term))
    && ['espana', 'pais', 'gobierno', 'sanchez', 'politic'].some((term) => normalized.includes(term));
  const priceContext = ['precio', 'precios', 'coste', 'cesta', 'ipc', 'electricidad', 'luz', 'alquiler'].some((term) => normalized.includes(term));
  const excluded = new Set();
  if (genericUnemployment && !youthRequested) excluded.add('youth_unemployment_rate');
  if (employmentEuropeRequested) excluded.add('employment_rate');
  if (educationContext && !youthRequested) excluded.add('youth_unemployment_rate');
  if (educationContext && !tertiaryEducationRequested) excluded.add('tertiary_education_attainment_rate');
  if (educationContext && !earlyEducationRequested) excluded.add('early_school_leaving_rate');
  if (educationContext && !earlyEducationEuropeRequested) excluded.add('early_school_leaving_rate_europe');
  if (educationContext && !neetRequested) excluded.add('neet_rate');
  if (educationContext && !neetEuropeRequested) excluded.add('neet_rate_europe');
  if (neetRequested && !neetEuropeRequested) excluded.add('neet_rate_europe');
  if (aropeEuropeRequested) excluded.add('arope_rate');
  if (aropeRequested && !aropeEuropeRequested) excluded.add('arope_rate_europe');
  // Per-capita spending is useful context, but it cannot answer a broad claim
  // that the health system has collapsed or that access has deteriorated.
  if (vagueHealthOutcome && !healthSpendRequested) excluded.add('health_expenditure_per_capita');
  if (vagueHealthOutcome && !healthSpendEuropeRequested) excluded.add('health_expenditure_per_capita_europe');
  if (vagueHealthOutcome && !unmetWaitingListRequested) excluded.add('unmet_healthcare_waiting_list_rate');
  // Total population and population-change rate are different questions. Keep
  // the change series out of generic population, migration, fertility, and
  // out-of-domain matches unless the wording explicitly asks about change.
  if (demographicContext && !populationChangeRequested) excluded.add('population_change_rate');
  // A broad subjective political complaint must not fall through to a nearby
  // demographic series just because it contains “España” or “población”.
  if (broadSubjectivePoliticalClaim) excluded.add('population_change_rate');
  if (priceContext && !inflationRequested) excluded.add('inflation_rate');
  // Recorded offences are useful for an explicit category/trend question,
  // never as a proxy for perceived insecurity, a local anecdote, or a causal
  // claim about immigration.
  if (crimeContext && (!recordedOffencesRequested || localOrCausalCrime)) excluded.add('recorded_offences');
  return excluded;
};
