import { spawn } from 'node:child_process';
import { once } from 'node:events';

const port = Number(process.env.CLAIM_TEST_PORT || 8790);
const endpoint = `http://127.0.0.1:${port}`;
const env = {
  ...process.env,
  LOCAL_CLASSIFIER_PORT: String(port),
  LOCAL_CLASSIFIER_BIND_HOST: '127.0.0.1',
  LOCAL_CLASSIFIER_TOKEN: '',
};

const resolver = spawn(process.execPath, ['scripts/local-claim-service.mjs'], {
  env,
  stdio: ['ignore', 'inherit', 'inherit'],
});

let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  if (!resolver.killed) resolver.kill('SIGTERM');
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

const waitForResolver = async () => {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${endpoint}/healthz`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {
      // The resolver may still be loading its index or the local model.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Local resolver did not become ready at ${endpoint}`);
};

try {
  await waitForResolver();
  const test = spawn(process.execPath, ['scripts/test-post-claims.mjs'], {
    env: { ...process.env, CLAIM_RESOLVER_URL: endpoint },
    stdio: 'inherit',
  });
  const [code] = await once(test, 'exit');
  const health = await fetch(`${endpoint}/healthz`).then((response) => response.json()).catch(() => undefined);
  if (health) {
    console.error(JSON.stringify({
      localResolver: {
        dynamic: health.dynamic === true,
        indexEntries: health.indexEntries,
        metrics: health.metrics || {},
      },
    }));
  }
  stop();
  await once(resolver, 'exit').catch(() => {});
  process.exit(code || 0);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  stop();
  await once(resolver, 'exit').catch(() => {});
  process.exit(1);
}
