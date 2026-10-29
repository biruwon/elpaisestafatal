import { INPUT_LIMITS } from './input-contract.mjs';

// Extraction describes the submitted material. It is never independent evidence
// for the truth of that material, and must survive both immediate and poll paths.
export const publicExtraction = (value) => {
  if (!value || !['image', 'audio', 'document', 'video', 'url'].includes(value.inputType)
    || !['complete', 'partial', 'failed'].includes(value.status)
    || typeof value.text !== 'string' || value.text.length > INPUT_LIMITS.maxExtractedCharacters
    || !Array.isArray(value.warnings) || value.warnings.length > 8 || !value.warnings.every((item) => typeof item === 'string' && item.length <= 1000)) return undefined;
  if (value.status !== 'failed' && !value.text.trim()) return undefined;
  return { inputType: value.inputType, status: value.status, text: value.text,
    ...(typeof value.submittedText === 'string' ? { submittedText: value.submittedText.slice(0, INPUT_LIMITS.maxTextCharacters) } : {}),
    warnings: value.warnings };
};

export const extractedClaim = (extraction) => extraction?.status === 'failed'
  ? extraction.submittedText || ''
  : [extraction?.submittedText, extraction?.text].filter(Boolean).join('\n\n');

export const attachExtraction = (response, value) => {
  const extraction = publicExtraction(value);
  if (!extraction) return response;
  if (!response.result) return { ...response, extraction };
  const limited = extraction.status !== 'complete';
  const notice = extraction.warnings.join(' ');
  const qualify = (text) => [notice, text].filter(Boolean).join('\n\n');
  return { ...response,
    state: limited && response.state === 'supported' ? 'limited' : response.state,
    result: { ...response.result, extraction,
      ...(limited ? { evidenceLevel: response.state === 'insufficient' ? 'insufficient' : 'limited', assessment: undefined,
        reply: qualify(response.result.reply), answer: qualify(response.result.answer),
        ...(response.result.shareableReply ? { shareableReply: qualify(response.result.shareableReply) } : {}),
        limitations: [...new Set([...extraction.warnings, ...(response.result.limitations || [])])] } : {}) } };
};
