/**
 * AI script feedback placeholder (M3 milestone implementation)
 */
export interface ScriptReviewRequest {
  scriptText: string;
  userId: string;
}

export interface ScriptReviewResponse {
  provider: 'gemini' | 'grok';
  result: Record<string, unknown>;
}

export async function reviewScript(
  _request: ScriptReviewRequest
): Promise<ScriptReviewResponse> {
  throw new Error("AI script review will be available in Milestone 3");
}
