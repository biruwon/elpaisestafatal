import { execFileSync } from 'node:child_process';

const models = [
  process.env.OLLAMA_ROUTER_MODEL || 'gemma3:4b',
  process.env.OLLAMA_EMBED_MODEL || 'bge-m3',
  process.env.OLLAMA_VISION_MODEL || 'qwen3-vl:8b',
];

try {
  execFileSync('ollama', ['list'], { stdio: 'ignore' });
} catch {
  console.error('Instala Ollama y vuelve a ejecutar este comando.');
  process.exit(1);
}

for (const model of models) {
  const installed = execFileSync('ollama', ['list'], { encoding: 'utf8' }).split('\n').some((line) => line.startsWith(model));
  if (installed) {
    console.log(`${model}: disponible`);
    continue;
  }
  console.log(`${model}: descargando...`);
  execFileSync('ollama', ['pull', model], { stdio: 'inherit' });
}

console.log('IA local preparada. Ejecuta npm run dev:ai para iniciar el flujo completo.');
