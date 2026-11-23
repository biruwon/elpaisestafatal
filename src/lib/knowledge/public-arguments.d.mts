import type { AnswerPlan } from './contracts';
import type { ArgumentAssessment } from './public-check';

export function publicArgumentsFromPlan(plan: AnswerPlan): ArgumentAssessment[];
export const publicClaimQualification: string;
export function requiresPublicClaimQualification(plan: AnswerPlan, argumentsList: ArgumentAssessment[]): boolean;
export function publicEvidenceLevelForArguments(level: AnswerPlan['evidenceLevel'], plan: AnswerPlan, argumentsList: ArgumentAssessment[]): AnswerPlan['evidenceLevel'];
export function qualifyPublicClaimReply(reply: string, argumentsList?: ArgumentAssessment[]): string;
