import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('config/domain-source-refresh.json');
const config = JSON.parse(fs.readFileSync(file, 'utf8'));
const feeds = config.feeds;
const errors = [];

if (!Array.isArray(feeds) || feeds.length === 0) errors.push('feeds must be a non-empty array');
const ids = new Set();
const domains = new Set(['immigration_benefits', 'immigration_crime', 'public_housing_allocation', 'wildfire_statistics', 'health_emergency_wait', 'pension_finance']);
const schedules = new Set(['daily', 'weekly', 'monthly', 'yearly']);
const modes = new Set(['active', 'discovery']);

for (const feed of feeds ?? []) {
  for (const field of ['id', 'domain', 'url', 'schedule', 'mode', 'title']) {
    if (typeof feed[field] !== 'string' || !feed[field].trim()) errors.push(`${field} missing for feed`);
  }
  if (ids.has(feed.id)) errors.push(`duplicate feed id: ${feed.id}`);
  ids.add(feed.id);
  if (!domains.has(feed.domain)) errors.push(`unsupported domain: ${feed.domain}`);
  if (!schedules.has(feed.schedule)) errors.push(`unsupported schedule for ${feed.id}`);
  if (!modes.has(feed.mode)) errors.push(`unsupported mode for ${feed.id}`);
  try {
    const url = new URL(feed.url);
    if (url.protocol !== 'https:') errors.push(`feed must use HTTPS: ${feed.id}`);
  } catch {
    errors.push(`invalid URL: ${feed.id}`);
  }
}

if (!feeds.some((feed) => feed.mode === 'active')) errors.push('at least one active feed is required');
if (!feeds.some((feed) => feed.mode === 'discovery')) errors.push('at least one discovery feed is required');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Domain refresh manifest valid (${feeds.length} feeds).`);
