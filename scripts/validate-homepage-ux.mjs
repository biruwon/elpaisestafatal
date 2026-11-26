import { readFile } from 'node:fs/promises';
const source = await readFile('src/pages/index.astro', 'utf8');
const required = [
  ['id="conversation-form"', 'checker form'],
  ['id="conversation-input"', 'checker input'],
  ['Escribe o pega una afirmación sobre España.', 'text-first input explanation'],
  ['Escribe o pega una afirmación o fragmento de hasta 4.000 caracteres.', 'text input limit guidance'],
  ['id="conversation-limit-warning"', 'visible over-limit feedback'],
  ['id="conversation-counter" aria-live="polite">0/4000</span>', 'text character counter matches the analyzer limit'],
  ['id="conversation-result"', 'result region'],
  ['id="recent-checks"', 'recent checks'],
  ['id="checker-suggestions"', 'suggestions disclosure'],
  ['class="checker-page"', 'checker page container'],
  ['Paráfrasis de temas habituales; no son citas literales ni representan a ningún grupo de votantes.', 'illustrative-example disclaimer'],
  ['data-example="La regularización masiva de inmigrantes colapsará los servicios públicos y disparará las paguitas."', 'immigration, services, and benefits example'],
  ['data-example="Los funcionarios con plaza son vagos y hay miles de puestos prescindibles."', 'public administration example'],
  ['data-example="El envejecimiento hace insostenible el sistema de pensiones y arruina las arcas públicas."', 'pension sustainability example'],
  ['data-example="Los jóvenes no pueden comprar vivienda sin la ayuda de sus padres y se ven obligados a emigrar."', 'youth housing example'],
  ['data-example="La inmigración dispara la delincuencia, pero el wokismo impide hablarlo."', 'immigration and crime example'],
  ['data-example="La inmigración reemplaza a la población española: quienes llegan tienen menos IQ y son manipulables."', 'population replacement example'],
  ['data-example="La carga fiscal y la inflación hunden los salarios; las pensiones las pagarán dos generaciones jóvenes."', 'tax burden example'],
  ['data-example="El Pacto Verde está destruyendo la agricultura española."', 'agriculture and green policy example'],
  ['data-example="La amnistía rompe la igualdad ante la ley."', 'amnesty example'],
  ['data-example="Echar a los okupas tarda años."', 'housing occupation example'],
];
const failures = required.filter(([fragment]) => !source.includes(fragment)).map(([, label]) => `homepage is missing ${label}`);
if (/<textarea[^>]*\smaxlength=/i.test(source)) failures.push('checker textarea must preserve long pastes instead of silently clipping them');
if (source.includes('claim-catalog.json') || source.includes('claimIndexData')) failures.push('homepage must not embed or fetch the full catalogue');
const checkerSource = await readFile('src/scripts/claim-checker.ts', 'utf8');
for (const fragment of [
  "import { LOCAL_COMPILER_TEXT_LIMIT, textAnalysisLimitFor }",
  'const inputCharacterLimit = (): number => isUrlInput() ? INPUT_LIMITS.maxTextCharacters : LOCAL_COMPILER_TEXT_LIMIT;',
  'if (inputType === \'text\' && textAnalysisLimitFor(original))',
  'No analizaremos un recorte',
  'input.value = initial;',
]) if (!checkerSource.includes(fragment)) failures.push(`text input boundary is missing ${fragment}`);
const limitGuard = checkerSource.indexOf("if (inputType === 'text' && textAnalysisLimitFor(original))");
const requestStart = checkerSource.indexOf("fetchJson('/api/check'");
if (limitGuard < 0 || requestStart < 0 || limitGuard > requestStart) failures.push('oversized text must be rejected before sending a request');
if (/input\.value\s*=\s*[^;]*\.slice\(/.test(checkerSource)) failures.push('claim text must not be silently truncated before checking');
const limitGuardEnd = checkerSource.indexOf('const valid = validateInputMetadata', limitGuard);
const limitGuardBody = limitGuard >= 0 && limitGuardEnd > limitGuard ? checkerSource.slice(limitGuard, limitGuardEnd) : '';
for (const fragment of ['finishLoading();', 'clarificationContext = undefined;', 'setMode(false);', 'if (result) result.innerHTML = \'\';']) {
  if (!limitGuardBody.includes(fragment)) failures.push(`over-limit text must reset stale state: ${fragment}`);
}
for (const mediaControl of ['data-attach=', 'id="conversation-file"', 'data-media-dropzone', 'Suelta aquí una imagen', 'conversation-media-help', 'Audio y vídeo']) {
  if (source.includes(mediaControl)) failures.push(`homepage should focus on text before enabling media input: ${mediaControl}`);
}
for (const retiredSection of ['popular-home', 'latest-home', 'warehouse-home', 'topics-home', 'home-how']) {
  if (source.includes(`class="${retiredSection}"`)) failures.push(`homepage still contains retired discovery section: ${retiredSection}`);
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Homepage UX validation passed: text-first checker, examples, recent checks, and no embedded catalogue.');
