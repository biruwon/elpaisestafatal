export function isMissingTextClaim(value: unknown): boolean;
export function missingTextClaimResponse(claim: string): {
  state: 'clarification';
  id: string;
  claim: string;
  question: string;
  options: never[];
};
