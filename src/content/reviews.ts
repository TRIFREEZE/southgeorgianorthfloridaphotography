/**
 * Reviews. Only add real reviews from real clients who agreed to be quoted.
 * The homepage review section stays hidden while this list is empty, and no
 * rating schema is ever generated from it.
 */
export interface Review {
  id: string;
  quote: string;
  name: string; // as the client agreed to be credited, e.g. "Ashley R."
  context?: string; // e.g. "Family session, Thomasville"
  consentConfirmed: true;
  date: string;
}

export const reviews: Review[] = [];
