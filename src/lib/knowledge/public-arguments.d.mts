import type { AnswerPlan } from './contracts';
import type { ArgumentAssessment } from './public-check';

export function publicArgumentsFromPlan(plan: AnswerPlan): ArgumentAssessment[];
