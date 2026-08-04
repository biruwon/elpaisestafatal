import { spawn } from 'node:child_process';

const project = process.env.PAGES_PROJECT || 'elpaisestafatal';
const productionUrl = (process.env.PRODUCTION_URL || 'https://elpaisestafatal.es').replace(/\/$/, '');
const deployTimeoutMs = Math.max(60_000, Number(process.env.PAGES_DEPLOY_TIMEOUT_MS || 180_000));
const propagationAttempts = Math.max(1, Number(process.env.PAGES_PROPAGATION_ATTEMPTS || 12));
const propagationDelayMs = Math.max(1_000, Number(process.env.PAGES_PROPAGATION_DELAY_MS || 5_000));

const run = (command, args, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: 'inherit', shell: false, ...options });
  const timer = setTimeout(() => {
    child.kill('SIGTERM');
    reject(new Error(`${command} ${args.join(' ')} exceeded the deployment timeout`));
  }, deployTimeoutMs);
  child.on('error', (error) => {
    clearTimeout(timer);
    reject(error);
  });
  child.on('exit', (code, signal) => {
    clearTimeout(timer);
    if (code === 0) resolve();
    else reject(new Error(`${command} ${args.join(' ')} exited with ${signal || `code ${code}`}`));
  });
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const checkCanonicalHealth = async () => {
  const response = await fetch(`${productionUrl}/api/health?release_probe=${Date.now()}`, {
    signal: AbortSignal.timeout(15_000),
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`canonical health returned HTTP ${response.status}`);
  const body = await response.json();
  if (!body || typeof body.status !== 'string' || typeof body.deterministic !== 'boolean') {
    throw new Error('canonical health returned an invalid public payload');
  }
};

const main = async () => {
  console.log(`Building and deploying ${project}…`);
  await run('npm', ['run', 'build']);
  await run('npx', ['wrangler', 'pages', 'deploy', 'dist', '--project-name', project]);

  let lastError;
  let healthVerified = false;
  for (let attempt = 1; attempt <= propagationAttempts; attempt += 1) {
    try {
      await checkCanonicalHealth();
      healthVerified = true;
      break;
    } catch (error) {
      lastError = error;
      if (attempt < propagationAttempts) {
        console.log(`Waiting for canonical deployment propagation (${attempt}/${propagationAttempts})…`);
        await sleep(propagationDelayMs);
      }
    }
  }
  if (!healthVerified) throw new Error(`Canonical deployment did not become verifiable: ${lastError?.message || 'unknown error'}`);
  console.log(`Canonical deployment is serving the new build: ${productionUrl}`);
  await run('npm', ['run', 'smoke:production']);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
