import { readFile } from 'node:fs/promises';
const source = await readFile('src/pages/index.astro', 'utf8');
const required = [
  ['id="conversation-form"', 'checker form'],
  ['id="conversation-input"', 'checker input'],
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
if (source.includes('claim-catalog.json') || source.includes('claimIndexData')) failures.push('homepage must not embed or fetch the full catalogue');
for (const retiredSection of ['popular-home', 'latest-home', 'warehouse-home', 'topics-home', 'home-how']) {
  if (source.includes(`class="${retiredSection}"`)) failures.push(`homepage still contains retired discovery section: ${retiredSection}`);
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Homepage UX validation passed: checker, examples, recent checks, and no embedded catalogue.');
