/** What the thesis panel reads from GET /api/thesis. */
export interface ThesisData {
  n_actions: number;
  /** Learned weight per readable feature. Positive leans toward it, negative away from it. */
  weights: Record<string, number>;
  readback: string | null;
  readback_error: string | null;
  /** True while a readback is being written. */
  readback_pending: boolean;
  fund: string | null;
}
