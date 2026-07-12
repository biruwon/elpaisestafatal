import { readFile } from 'node:fs/promises';

const input = process.argv[2];
if (!input) {
  console.error('Uso: node scripts/calculate-concerns.mjs <3557_etiq.csv>');
  process.exit(1);
}

function parseDelimited(text, delimiter = ';') {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { field += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { row.push(field); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = '';
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const rows = parseDelimited((await readFile(input, 'utf8')).replace(/^\uFEFF/, ''));
const headers = rows.shift().map((value) => value.split(':', 1)[0]);
const index = Object.fromEntries(headers.map((value, position) => [value, position]));
const answers = ['PESPANNA1', 'PESPANNA2', 'PESPANNA3'].map((key) => index[key]);
const weightIndex = index.PESO;
const records = rows.map((values) => ({
  answers: answers.map((position) => values[position]),
  weight: Number(values[weightIndex].replace(',', '.')),
}));
const total = records.reduce((sum, row) => sum + row.weight, 0);
const percent = (test) => Number((100 * records.reduce((sum, row) => sum + (test(row) ? row.weight : 0), 0) / total).toFixed(2));
const categories = [...new Set(records.flatMap((row) => row.answers))].filter((value) => !['N.S.','N.C.','Ninguno','Otras respuestas'].includes(value));
const raw = categories.map((label) => ({ label, first: percent((row) => row.answers[0] === label), any: percent((row) => row.answers.includes(label)) }));
const groups = {
  politica: ['Los problemas políticos en general','El Gobierno y partidos o políticos/as concretos/as','El mal comportamiento de los/as políticos/as','Lo que hacen los partidos políticos','La falta de acuerdos, unidad y capacidad de colaboración. Situación e inestabilidad política'],
  empleo: ['Los problemas relacionados con la calidad del empleo','El paro'],
  extremismos: ['Los extremismos','Aumento de la crispación social, revueltas sociales'],
};
const grouped = Object.entries(groups).map(([label, members]) => ({ label, first: percent((row) => members.includes(row.answers[0])), any: percent((row) => row.answers.some((answer) => members.includes(answer))) }));
console.log(JSON.stringify({ study: 3557, interviews: rows.length, weightedTotal: Number(total.toFixed(5)), raw, grouped }, null, 2));
