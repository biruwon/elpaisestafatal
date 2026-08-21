import { allMetricPolicies } from './metric-evidence-policy.mjs';

const policies = allMetricPolicies();
if (policies.length < 100) throw new Error(`Only ${policies.length} metric policies were generated`);
for (const policy of policies) {
  if (!policy.metricId || !policy.family || !policy.requiredDimensions.length || !policy.supportedGeographies.length) throw new Error(`Incomplete policy for ${policy.metricId}`);
  if (!Number.isFinite(policy.freshnessPolicy.maxAgeDays) || !['exclude', 'label-limited', 'fallback-only'].includes(policy.freshnessPolicy.staleAction)) throw new Error(`Invalid freshness policy for ${policy.metricId}`);
  if (!policy.supports.length || !policy.limitations.length) throw new Error(`Missing interpretation policy for ${policy.metricId}`);
}
console.log(`Metric evidence policy validation passed: ${policies.length} registry metrics have dimensions, scope, freshness, and interpretation policies.`);
