export interface InputValidationResult { ok: boolean; code: string }
export interface InputMetadata { text?: string; inputType?: string; hasFile?: boolean; fileSize?: number; mimeType?: string; fileName?: string }
export const INPUT_LIMITS: {
  readonly maxTextCharacters: number;
  readonly maxRequestBytes: number;
  readonly maxFileBytes: number;
  readonly imageMimeTypes: readonly string[];
  readonly audioMimeTypes: readonly string[];
  readonly documentMimeTypes: readonly string[];
  readonly videoMimeTypes: readonly string[];
  readonly maxExtractedCharacters: number;
  readonly maxDocumentPages: number;
  readonly maxVideoSeconds: number;
  readonly maxAudioSeconds: number;
};
export function fileMimeType(mimeType?: string, fileName?: string): string;
export function inputTypeForFile(mimeType?: string, fileName?: string): 'image' | 'audio' | 'document' | 'video' | undefined;
export function inputErrorMessage(code: string): string;
export function validateInputMetadata(metadata?: InputMetadata): InputValidationResult;
