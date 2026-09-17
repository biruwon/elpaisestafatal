import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/detect-camera-cuts.mjs <video-or-hls-url> [output.json]');
const threshold = Number(process.env.SCENE_THRESHOLD || 0.4);
const args = ['-hide_banner', '-loglevel', 'info', '-i', input, '-vf', `select='gt(scene,${threshold})',showinfo`, '-an', '-f', 'null', '-'];
const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
let stderr = ''; child.stderr.on('data', chunk => { stderr += chunk.toString(); });
const code = await new Promise(resolve => child.on('close', resolve));
if (code !== 0) throw new Error(`ffmpeg exited ${code}: ${stderr.slice(-1200)}`);
const cuts = [...stderr.matchAll(/pts_time:([0-9.]+)/g)].map(match => Number(match[1])).filter(Number.isFinite);
const result = { input, generatedAt: new Date().toISOString(), method: 'ffmpeg select scene + showinfo', threshold, cameraCutsDetected: cuts.length, cutTimesSeconds: cuts };
await writeFile(process.argv[3] || 'data/camera-cuts.json', JSON.stringify(result, null, 2));
console.log(`detected ${cuts.length} scene changes`);
