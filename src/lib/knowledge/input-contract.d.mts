export interface InputValidationResult { ok: boolean; code: string }
export interface InputMetadata { text?: string; inputType?: string; hasFile?: boolean; fileSize?: number; mimeType?: string }
export const INPUT_LIMITS: {
  readonly maxTextCharacters: number;
  readonly maxRequestBytes: number;
  readonly maxFileBytes: number;
  readonly imageMimeTypes: readonly string[];
  readonly audioMimeTypes: readonly string[];
};
export function validateInputMetadata(metadata?: InputMetadata): InputValidationResult;
