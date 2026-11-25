import assert from 'node:assert/strict';
import { deterministicFallbackCompiler, FALLBACK_CLAIM_MAX_CHARS } from './knowledge/fallback-compiler.mjs';
import { normalizeCompilerOutput } from './knowledge/local-compiler-contract.mjs';
import { LOCAL_COMPILER_TEXT_LIMIT, textAnalysisLimitFor, textAnalysisLimitPlan } from '../src/lib/knowledge/text-analysis-coverage.mjs';
import { validateAnswerPlan } from './knowledge/answer-plan-validation.mjs';

assert.equal(textAnalysisLimitFor('Una afirmación corta'), undefined);
assert.equal(textAnalysisLimitFor('x'.repeat(FALLBACK_CLAIM_MAX_CHARS + 1)), undefined,
  'Text longer than the deterministic API fallback bound remains eligible for the full local compiler');
assert.equal(textAnalysisLimitFor('x'.repeat(LOCAL_COMPILER_TEXT_LIMIT + 1)), LOCAL_COMPILER_TEXT_LIMIT,
  'Input beyond the local compiler prompt limit must remain an explicit evidence gap');

const lateClaim = 'El alquiler medio en Madrid subió durante 2025.';
const fullText = `${'Contexto sin una afirmación medible. '.repeat(12)}${lateClaim}`;
const parsedFullText = deterministicFallbackCompiler(fullText, { maxChars: LOCAL_COMPILER_TEXT_LIMIT });
assert(parsedFullText.normalized.includes(lateClaim), 'The full local parser must retain text after the legacy 300-character fallback boundary');
assert(parsedFullText.explicitPropositions.some((item) => item.text.includes('alquiler')), 'A measurable proposition after the legacy fallback boundary must be visible to the compiler');
assert(!deterministicFallbackCompiler(fullText).normalized.includes(lateClaim), 'The API-only fallback must keep its conservative 300-character bound');
const normalizedFullText = normalizeCompilerOutput(null, fullText, { maxChars: LOCAL_COMPILER_TEXT_LIMIT });
assert(normalizedFullText.normalized.includes(lateClaim), 'The local compiler contract must normalize the complete bounded text');

assert(FALLBACK_CLAIM_MAX_CHARS < LOCAL_COMPILER_TEXT_LIMIT, 'The local parser should accept more text than the conservative API fallback');
const plan = textAnalysisLimitPlan(LOCAL_COMPILER_TEXT_LIMIT);
const validation = validateAnswerPlan(plan);
assert(validation.ok, `The text-limit response must satisfy the public answer contract: ${validation.errors.join('; ')}`);
assert.equal(plan.evidenceLevel, 'insufficient');
assert.deepEqual(plan.evidenceIds, []);
assert.deepEqual(plan.sourceIds, []);
assert.match(plan.shareableReply, new RegExp(String(LOCAL_COMPILER_TEXT_LIMIT)));
assert.match(plan.shareableReply, /no confirma ni descarta/i);

console.log('Text-analysis coverage validation passed: parser limits are explicit and never produce prefix-only verdicts.');
